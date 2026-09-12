#!/usr/bin/env python3
"""
A股持仓查询、损益计算、交易记录
"""
import argparse
import json
import os
import sys
import time
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(SCRIPT_DIR, "..", "state.json")
INITIAL_CASH = 1_000_000


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def get_realtime_price(code):
    """获取实时价格"""
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
            price = float(fields[3]) if fields[3] else 0
            pre_close = float(fields[2]) if fields[2] else 0
            if price > 0:
                return {"price": price, "pre_close": pre_close}
    except Exception:
        pass
    return None


def show_portfolio():
    """展示持仓和损益"""
    state = load_state()
    if not state:
        result = {
            "status": "uninitialized",
            "message": "Uninitialized. Starting cash: {:,} yuan. Ready to trade.".format(INITIAL_CASH),
            "cash": INITIAL_CASH,
            "total_value": INITIAL_CASH,
            "pnl": 0,
            "pnl_percent": "0.00%",
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    # 计算每只股票的市值和盈亏
    positions_detail = []
    total_market_value = 0

    for code, pos in state.get("positions", {}).items():
        quote = get_realtime_price(code)
        current_price = quote["price"] if quote else pos["avg_cost"]
        market_value = pos["shares"] * current_price
        cost_value = pos["shares"] * pos["avg_cost"]
        unrealized_pnl = market_value - cost_value
        pnl_pct = (unrealized_pnl / cost_value * 100) if cost_value > 0 else 0
        sign = "+" if pnl_pct >= 0 else ""

        total_market_value += market_value

        positions_detail.append({
            "code": code,
            "name": pos["name"],
            "shares": pos["shares"],
            "avg_cost": pos["avg_cost"],
            "current_price": current_price,
            "market_value": round(market_value, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "pnl_percent": sign + str(round(pnl_pct, 2)) + "%",
            "buy_date": pos.get("buy_date", ""),
        })

    total_value = state["cash"] + total_market_value
    total_pnl = total_value - state["initial_cash"]
    total_pnl_pct = (total_pnl / state["initial_cash"] * 100) if state["initial_cash"] > 0 else 0
    sign = "+" if total_pnl_pct >= 0 else ""

    result = {
        "initial_cash": state["initial_cash"],
        "cash": round(state["cash"], 2),
        "positions": positions_detail,
        "position_count": len(positions_detail),
        "total_market_value": round(total_market_value, 2),
        "total_value": round(total_value, 2),
        "pnl": round(total_pnl, 2),
        "pnl_percent": sign + str(round(total_pnl_pct, 2)) + "%",
        "trade_count": len(state.get("trades", [])),
        "update_time": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))


def show_history():
    """展示交易记录"""
    state = load_state()
    if not state or not state.get("trades"):
        print(json.dumps({"message": "No trade history"}, ensure_ascii=False, indent=2))
        return
    print(json.dumps(state["trades"], ensure_ascii=False, indent=2))


def reset():
    """重置账户"""
    state = {
        "initial_cash": INITIAL_CASH,
        "cash": INITIAL_CASH,
        "positions": {},
        "trades": [],
    }
    save_state(state)
    print(json.dumps({
        "success": True,
        "message": "Account reset. Cash: {:,} yuan. All positions cleared.".format(INITIAL_CASH),
    }, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description="A-share portfolio viewer")
    parser.add_argument("--history", action="store_true", help="Show trade history")
    parser.add_argument("--reset", action="store_true", help="Reset account")
    args = parser.parse_args()

    if args.reset:
        reset()
    elif args.history:
        show_history()
    else:
        show_portfolio()


if __name__ == "__main__":
    main()
