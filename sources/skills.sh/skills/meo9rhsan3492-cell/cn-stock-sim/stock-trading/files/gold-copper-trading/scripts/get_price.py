#!/usr/bin/env python3
"""
获取黄金/铜实时价格
优先使用 openctp 模拟交易所行情，失败时降级到新浪财经免费接口
"""
import argparse
import json
import os
import sys
import threading
import time

# ============================================================
# 方案一：openctp CTP 行情（优先）
# ============================================================

def get_price_via_openctp(symbol: str) -> dict | None:
    """通过 openctp 获取行情"""
    try:
        from openctp_ctp import mdapi
    except ImportError:
        return None  # 没装 openctp，降级

    FRONT = os.environ.get("OPENCTP_MD_FRONT", "tcp://121.37.80.177:20004")
    USER = os.environ.get("OPENCTP_USER", "")
    PASSWORD = os.environ.get("OPENCTP_PASSWORD", "")
    PRODUCT_MAP = {"gold": "au", "copper": "cu"}
    product = PRODUCT_MAP.get(symbol, symbol)

    result = {}
    done = threading.Event()
    instruments = []
    instruments_done = threading.Event()

    class MySpi(mdapi.CThostFtdcMdSpi):
        def __init__(self, api_instance):
            super().__init__()
            self._api = api_instance

        def OnFrontConnected(self):
            req = mdapi.CThostFtdcReqUserLoginField()
            req.BrokerID = ""
            req.UserID = USER
            req.Password = PASSWORD
            self._api.ReqUserLogin(req, 0)

        def OnRspUserLogin(self, pRspUserLogin, pRspInfo, nRequestID, bIsLast):
            if pRspInfo and pRspInfo.ErrorID != 0:
                done.set()
                return
            # 订阅行情 - 需要先知道合约代码
            # openctp 行情接口不支持查询合约列表，所以用常见合约代码尝试
            # 主力合约通常是最近的几个月份
            now = time.localtime()
            year = now.tm_year % 100  # 26
            month = now.tm_mon
            # 生成接下来几个月的合约代码
            candidates = []
            for m_offset in range(0, 13):
                y = year
                m = month + m_offset
                if m > 12:
                    m -= 12
                    y += 1
                candidates.append(f"{product}{y:02d}{m:02d}")
            # 订阅所有候选合约
            self._api.SubscribeMarketData([c.encode() for c in candidates])
            # 设置超时
            threading.Timer(5.0, lambda: done.set()).start()

        def OnRtnDepthMarketData(self, pData):
            if pData is None:
                return
            inst_id = pData.InstrumentID
            if not inst_id.lower().startswith(product):
                return
            # 取第一个收到行情的合约（通常是主力）
            if pData.LastPrice > 0 and pData.LastPrice < 1e18:
                if not result:  # 只取第一个有效的
                    result["instrument_id"] = inst_id
                    result["last_price"] = pData.LastPrice
                    result["bid_price"] = pData.BidPrice1
                    result["ask_price"] = pData.AskPrice1
                    result["volume"] = pData.Volume
                    result["open_interest"] = pData.OpenInterest
                    result["high"] = pData.HighestPrice
                    result["low"] = pData.LowestPrice
                    result["open"] = pData.OpenPrice
                    result["pre_close"] = pData.PreClosePrice
                    result["update_time"] = pData.UpdateTime
                    done.set()

        def OnFrontDisconnected(self, nReason):
            done.set()

    api = mdapi.CThostFtdcMdApi.CreateFtdcMdApi("")
    spi = MySpi(api)
    api.RegisterSpi(spi)
    api.RegisterFront(FRONT)
    api.Init()

    done.wait(timeout=8)
    # 释放资源
    try:
        api.Release()
    except:
        pass

    if result and result.get("last_price", 0) > 0:
        return result
    return None


# ============================================================
# 方案二：新浪财经免费接口（降级方案）
# ============================================================

def get_price_via_sina(symbol: str) -> dict | None:
    """通过新浪财经获取行情（免费，无需注册）"""
    import urllib.request

    SINA_MAP = {
        "gold": {"code": "AU0", "name": "黄金连续", "unit": "元/克"},
        "copper": {"code": "CU0", "name": "铜连续", "unit": "元/吨"},
    }

    info = SINA_MAP.get(symbol)
    if not info:
        return None

    url = f"https://hq.sinajs.cn/list={info['code']}"
    req = urllib.request.Request(url, headers={
        "Referer": "https://finance.sina.com.cn"
    })

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            text = resp.read().decode("gbk")
    except Exception as e:
        return None

    data_str = text.split('"')[1] if '"' in text else ""
    fields = data_str.split(",")

    if len(fields) < 9 or not fields[8]:
        return None

    try:
        last = float(fields[8]) if fields[8] else 0
        pre_close = float(fields[5]) if fields[5] else 0
    except (ValueError, IndexError):
        return None

    if last <= 0:
        return None

    return {
        "instrument_id": info["code"],
        "name": info["name"],
        "last_price": last,
        "bid_price": float(fields[6]) if fields[6] else 0,
        "ask_price": float(fields[7]) if fields[7] else 0,
        "open": float(fields[2]) if fields[2] else 0,
        "high": float(fields[3]) if fields[3] else 0,
        "low": float(fields[4]) if fields[4] else 0,
        "pre_close": pre_close,
        "unit": info["unit"],
    }


# ============================================================
# 统一入口
# ============================================================

def get_price(symbol: str) -> dict:
    """获取价格，优先 openctp，失败降级新浪"""
    name_map = {"gold": "黄金", "copper": "铜"}
    unit_map = {"gold": "元/克", "copper": "元/吨"}

    # 先尝试 openctp
    data = get_price_via_openctp(symbol)
    source = "openctp模拟交易所"

    # 降级到新浪
    if not data:
        data = get_price_via_sina(symbol)
        source = "新浪财经"

    if not data:
        return {"error": f"无法获取{name_map.get(symbol, symbol)}行情，请检查网络连接"}

    # 计算涨跌
    last = data.get("last_price", 0)
    pre = data.get("pre_close", 0)
    change = round(last - pre, 2) if pre > 0 else 0
    change_pct = round(change / pre * 100, 2) if pre > 0 else 0

    return {
        "name": name_map.get(symbol, data.get("name", symbol)),
        "instrument_id": data.get("instrument_id", ""),
        "last_price": last,
        "bid_price": data.get("bid_price", 0),
        "ask_price": data.get("ask_price", 0),
        "open": data.get("open", 0),
        "high": data.get("high", 0),
        "low": data.get("low", 0),
        "pre_close": pre,
        "change": change,
        "change_percent": f"{'+' if change_pct >= 0 else ''}{change_pct}%",
        "unit": unit_map.get(symbol, data.get("unit", "")),
        "source": source,
        "update_time": data.get("update_time", time.strftime("%H:%M:%S")),
    }


def get_ratio() -> dict:
    """计算铜金价比"""
    gold = get_price("gold")
    copper = get_price("copper")

    if "error" in gold:
        return gold
    if "error" in copper:
        return copper

    gold_price = gold["last_price"]
    copper_price = copper["last_price"]

    if gold_price <= 0:
        return {"error": "金价为0，无法计算"}

    ratio = round(copper_price / gold_price, 2)
    threshold = 90

    if ratio > threshold:
        direction = "偏向黄金（铜金比高于阈值，建议卖铜买金）"
    elif ratio < threshold:
        direction = "偏向铜（铜金比低于阈值，建议卖金买铜）"
    else:
        direction = "均衡（铜金比接近阈值，建议观望）"

    return {
        "gold_price": gold_price,
        "gold_unit": gold["unit"],
        "copper_price": copper_price,
        "copper_unit": copper["unit"],
        "ratio": ratio,
        "threshold": threshold,
        "diff": round(ratio - threshold, 2),
        "direction": direction,
        "source": gold["source"],
    }


def main():
    parser = argparse.ArgumentParser(description="获取黄金/铜实时价格")
    parser.add_argument("--symbol", choices=["gold", "copper"], help="查询品种")
    parser.add_argument("--ratio", action="store_true", help="计算铜金价比")
    args = parser.parse_args()

    if args.ratio:
        result = get_ratio()
    elif args.symbol:
        result = get_price(args.symbol)
    else:
        parser.print_help()
        sys.exit(1)

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
