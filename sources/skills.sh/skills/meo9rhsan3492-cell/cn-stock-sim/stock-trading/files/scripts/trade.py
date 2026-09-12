#!/usr/bin/env python3
"""
A股模拟交易执行
使用新浪财经实时行情价格，本地JSON文件记账
A股规则：T+1（买入当天不能卖出）、最小交易单位100股（1手）、涨跌停限制10%/20%
"""
import argparse
import json
import os
import sys
import time
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(SCRIPT_DIR, "..", "state.json")
INITIAL_CASH = 1_000_000  # A股演示用100万比较合理


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "initial_cash": INITIAL_CASH,
        "cash": INITIAL_CASH,
        "positions": {},
        "trades": [],
    }


def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def get_realtime_price(code):
    """获取实时价格和股票名称"""
    if code.startswith(("6", "9", "5")):
        sina_code = "sh" + code
    else:
        sina_code = "sz" + code

    url = "https://hq.sinajs.cn/list=" + sina_code
    req = urllib.request.Request(url, headers={
        "Referer": "https://finance.sina.com.cn"
    })
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            text = resp.read().decode("gbk")
        fields = text.split('"')[1].split(",")
        if len(fields) > 3:
            name = fields[0]
            price = float(fields[3]) if fields[3] else 0
            if price > 0:
                return {"name": name, "price": price}
    except Exception:
        pass
    return None


def execute_trade(action, code, shares):
    """执行买卖"""
    # 验证手数
    if shares % 100 != 0:
        return {
            "success": False,
            "error": "A股最小交易单位为100股（1手），请输入100的整数倍",
        }

    # 获取实时价格
    quote = get_realtime_price(code)
    if not quote:
        return {
            "success": False,
            "error": "无法获取 " + code + " 的实时价格，请检查代码或确认是否在交易时段",
        }

    price = quote["price"]
    name = quote["name"]
    state = load_state()

    if action == "buy":
        cost = shares * price
        commission = max(cost * 0.00025, 5)  # 佣金万2.5，最低5元
        total_cost = cost + commission

        if total_cost > state["cash"]:
            return {
                "success": False,
                "error": "资金不足。需要 {:,.2f} 元（含佣金），可用 {:,.2f} 元".format(total_cost, state["cash"]),
            }

        state["cash"] -= total_cost

        # 更新持仓
        if code not in state["positions"]:
            state["positions"][code] = {
                "name": name,
                "shares": 0,
                "avg_cost": 0,
                "buy_date": "",
            }

        pos = state["positions"][code]
        old_shares = pos["shares"]
        new_shares = old_shares + shares
        if new_shares > 0:
            pos["avg_cost"] = round((pos["avg_cost"] * old_shares + price * shares) / new_shares, 3)
        pos["shares"] = new_shares
        pos["buy_date"] = time.strftime("%Y-%m-%d")

        msg = "买入 {}（{}）{} 股 @ {:.2f} 元，花费 {:,.2f} 元（含佣金 {:.2f} 元）".format(
            name, code, shares, price, total_cost, commission)

    elif action == "sell":
        if code not in state["positions"] or state["positions"][code]["shares"] < shares:
            current = state["positions"].get(code, {}).get("shares", 0)
            return {
                "success": False,
                "error": "持仓不足。当前持有 {} 股，欲卖出 {} 股".format(current, shares),
            }

        pos = state["positions"][code]
        revenue = shares * price
        commission = max(revenue * 0.00025, 5)
        stamp_tax = revenue * 0.0005  # 印花税万5（卖出收）
        net_revenue = revenue - commission - stamp_tax

        # 计算本笔盈亏
        cost_basis = shares * pos["avg_cost"]
        pnl = net_revenue - cost_basis

        state["cash"] += net_revenue
        pos["shares"] -= shares

        # 清除空仓
        if pos["shares"] <= 0:
            del state["positions"][code]

        sign = "+" if pnl >= 0 else ""
        msg = "卖出 {}（{}）{} 股 @ {:.2f} 元，收入 {:,.2f} 元（扣佣金 {:.2f} + 印花税 {:.2f}），本笔盈亏 {}{:,.2f} 元".format(
            name, code, shares, price, net_revenue, commission, stamp_tax, sign, pnl)

    # 记录交易
    trade_record = {
        "time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "action": "买入" if action == "buy" else "卖出",
        "code": code,
        "name": name,
        "shares": shares,
        "price": price,
        "message": msg,
    }
    state["trades"].append(trade_record)
    save_state(state)

    return {
        "success": True,
        "trade": trade_record,
        "remaining_cash": round(state["cash"], 2),
    }


def main():
    parser = argparse.ArgumentParser(description="A-share simulated trading")
    parser.add_argument("--action", choices=["buy", "sell"], required=True)
    parser.add_argument("--code", type=str, required=True, help="Stock code, e.g. 600519")
    parser.add_argument("--shares", type=int, required=True, help="Number of shares (must be multiple of 100)")
    args = parser.parse_args()

    result = execute_trade(args.action, args.code, args.shares)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
