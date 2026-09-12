#!/usr/bin/env python3
"""
模拟交易执行
优先通过 openctp 下单（真实撮合），同时在本地 state.json 记账
如果 openctp 不可用，纯本地记账（使用实时行情价格）
"""
import argparse
import json
import os
import sys
import threading
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(SCRIPT_DIR, "..", "state.json")

# 合约信息
CONTRACT_INFO = {
    "gold": {
        "name": "黄金",
        "unit": "克",
        "product": "au",
        "multiplier": 1000,   # 1手 = 1000克
        "price_tick": 0.02,
    },
    "copper": {
        "name": "铜",
        "unit": "吨",
        "product": "cu",
        "multiplier": 5,      # 1手 = 5吨
        "price_tick": 10,
    },
}


def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "initial_cash": 100_000_000,
        "cash": 100_000_000,
        "gold_qty": 0,
        "gold_avg_price": 0,
        "copper_qty": 0,
        "copper_avg_price": 0,
        "trades": [],
    }


def save_state(state: dict):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def get_current_price(asset: str) -> float:
    """获取当前价格（复用 get_price.py 的逻辑）"""
    # 先尝试新浪（更快更稳定）
    import urllib.request
    code = "AU0" if asset == "gold" else "CU0"
    url = f"https://hq.sinajs.cn/list={code}"
    req = urllib.request.Request(url, headers={
        "Referer": "https://finance.sina.com.cn"
    })
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            text = resp.read().decode("gbk")
        fields = text.split('"')[1].split(",")
        price = float(fields[8]) if len(fields) > 8 and fields[8] else 0
        if price > 0:
            return price
    except Exception:
        pass

    # 降级：尝试 openctp
    try:
        sys.path.insert(0, SCRIPT_DIR)
        from get_price import get_price_via_openctp
        data = get_price_via_openctp(asset)
        if data and data.get("last_price", 0) > 0:
            return data["last_price"]
    except Exception:
        pass

    # 最终降级：返回参考价
    defaults = {"gold": 500.0, "copper": 45000.0}
    return defaults.get(asset, 0)


def try_openctp_order(asset: str, action: str, volume_in_lots: int, price: float) -> dict | None:
    """尝试通过 openctp 下单"""
    try:
        from openctp_ctp import tdapi
    except ImportError:
        return None

    FRONT = os.environ.get("OPENCTP_TD_FRONT", "tcp://121.37.80.177:20002")
    USER = os.environ.get("OPENCTP_USER", "")
    PASSWORD = os.environ.get("OPENCTP_PASSWORD", "")

    if not USER:
        return None

    info = CONTRACT_INFO[asset]
    result = {}
    done = threading.Event()

    # 生成合约代码（取最近的主力月份）
    now = time.localtime()
    year = now.tm_year % 100
    month = now.tm_mon
    # 主力合约通常是当月或下月
    for m_offset in [1, 2, 3, 4, 5, 6]:
        y = year
        m = month + m_offset
        if m > 12:
            m -= 12
            y += 1
        instrument_id = f"{info['product']}{y:02d}{m:02d}"
        break  # 取最近的一个

    class MySpi(tdapi.CThostFtdcTraderSpi):
        def __init__(self, api_instance):
            super().__init__()
            self._api = api_instance
            self._logged_in = threading.Event()

        def OnFrontConnected(self):
            req = tdapi.CThostFtdcReqUserLoginField()
            req.BrokerID = ""
            req.UserID = USER
            req.Password = PASSWORD
            self._api.ReqUserLogin(req, 0)

        def OnRspUserLogin(self, pRspUserLogin, pRspInfo, nRequestID, bIsLast):
            if pRspInfo and pRspInfo.ErrorID != 0:
                result["error"] = f"登录失败: {pRspInfo.ErrorMsg}"
                done.set()
                return
            self._logged_in.set()

            # 下单
            req = tdapi.CThostFtdcInputOrderField()
            req.BrokerID = ""
            req.InvestorID = USER
            req.InstrumentID = instrument_id
            req.OrderRef = str(int(time.time() * 1000) % 1000000)

            if action == "buy":
                req.Direction = tdapi.THOST_FTDC_D_Buy
                req.CombOffsetFlag = tdapi.THOST_FTDC_OF_Open
            else:
                req.Direction = tdapi.THOST_FTDC_D_Sell
                req.CombOffsetFlag = tdapi.THOST_FTDC_OF_Close

            req.OrderPriceType = tdapi.THOST_FTDC_OPT_LimitPrice
            req.LimitPrice = price
            req.VolumeTotalOriginal = volume_in_lots
            req.TimeCondition = tdapi.THOST_FTDC_TC_GFD
            req.VolumeCondition = tdapi.THOST_FTDC_VC_AV
            req.CombHedgeFlag = tdapi.THOST_FTDC_HF_Speculation
            req.ContingentCondition = tdapi.THOST_FTDC_CC_Immediately
            req.ForceCloseReason = tdapi.THOST_FTDC_FCC_NotForceClose
            req.MinVolume = 1

            ret = self._api.ReqOrderInsert(req, 0)
            if ret != 0:
                result["error"] = f"下单请求失败，返回码: {ret}"
                done.set()

        def OnRtnOrder(self, pOrder):
            if pOrder:
                status = pOrder.OrderStatus
                result["order_status"] = status
                result["instrument"] = pOrder.InstrumentID

        def OnRtnTrade(self, pTrade):
            if pTrade:
                result["traded_price"] = pTrade.Price
                result["traded_volume"] = pTrade.Volume
                result["trade_time"] = pTrade.TradeTime
                result["success"] = True
                done.set()

        def OnRspOrderInsert(self, pInputOrder, pRspInfo, nRequestID, bIsLast):
            if pRspInfo and pRspInfo.ErrorID != 0:
                result["error"] = f"下单被拒: {pRspInfo.ErrorMsg}"
                done.set()

        def OnFrontDisconnected(self, nReason):
            if not result:
                result["error"] = f"连接断开: {nReason}"
            done.set()

    api = tdapi.CThostFtdcTraderApi.CreateFtdcTraderApi("")
    spi = MySpi(api)
    api.RegisterSpi(spi)
    api.RegisterFront(FRONT)
    api.SubscribePrivateTopic(tdapi.THOST_TERT_QUICK)
    api.SubscribePublicTopic(tdapi.THOST_TERT_QUICK)
    api.Init()

    done.wait(timeout=10)
    try:
        api.Release()
    except:
        pass

    return result if result else None


def execute_trade(action: str, asset: str, amount: float) -> dict:
    """执行交易"""
    info = CONTRACT_INFO[asset]
    state = load_state()
    price = get_current_price(asset)

    if price <= 0:
        return {"success": False, "error": "无法获取当前价格"}

    asset_cn = info["name"]
    unit = info["unit"]

    # 计算手数（CTP 按手交易）
    lots = max(1, int(amount / info["multiplier"]))
    actual_amount = lots * info["multiplier"]

    # 尝试通过 openctp 下单
    openctp_result = try_openctp_order(asset, action, lots, price)
    via_openctp = openctp_result and openctp_result.get("success")

    if via_openctp:
        price = openctp_result.get("traded_price", price)
        exchange_msg = f"（已通过 openctp 模拟交易所撮合成交）"
    else:
        exchange_msg = f"（本地模拟成交）"

    # 更新本地账本
    if action == "buy":
        cost = actual_amount * price
        if cost > state["cash"]:
            return {
                "success": False,
                "error": f"资金不足。需要 {cost:,.2f} 元，可用 {state['cash']:,.2f} 元",
            }
        state["cash"] -= cost
        qty_key = f"{asset}_qty"
        avg_key = f"{asset}_avg_price"
        old_qty = state[qty_key]
        new_qty = old_qty + actual_amount
        if new_qty > 0:
            state[avg_key] = round(
                (state[avg_key] * old_qty + price * actual_amount) / new_qty, 4
            )
        state[qty_key] = new_qty
        msg = f"买入 {asset_cn} {actual_amount:,.0f} {unit} @ {price:,.2f}，花费 {cost:,.2f} 元"

    elif action == "sell":
        qty_key = f"{asset}_qty"
        if state[qty_key] < actual_amount:
            return {
                "success": False,
                "error": f"持仓不足。当前持有 {state[qty_key]:,.0f} {unit}，欲卖出 {actual_amount:,.0f} {unit}",
            }
        revenue = actual_amount * price
        state["cash"] += revenue
        state[qty_key] -= actual_amount
        avg = state[f"{asset}_avg_price"]
        pnl = (price - avg) * actual_amount if avg > 0 else 0
        msg = f"卖出 {asset_cn} {actual_amount:,.0f} {unit} @ {price:,.2f}，收入 {revenue:,.2f} 元"
        if avg > 0:
            msg += f"，本笔盈亏 {'+' if pnl >= 0 else ''}{pnl:,.2f} 元"

    # 记录交易
    trade = {
        "time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "action": "买入" if action == "buy" else "卖出",
        "asset": asset_cn,
        "amount": f"{actual_amount:,.0f} {unit}",
        "lots": lots,
        "price": price,
        "message": msg,
    }
    state["trades"].append(trade)
    save_state(state)

    return {
        "success": True,
        "trade": trade,
        "remaining_cash": round(state["cash"], 2),
        "exchange": exchange_msg,
    }


def main():
    parser = argparse.ArgumentParser(description="模拟交易执行")
    parser.add_argument("--action", choices=["buy", "sell"], required=True, help="买入或卖出")
    parser.add_argument("--asset", choices=["gold", "copper"], required=True, help="品种")
    parser.add_argument("--amount", type=float, required=True, help="数量（黄金：克，铜：吨）")
    args = parser.parse_args()

    result = execute_trade(args.action, args.asset, args.amount)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
