#!/usr/bin/env python3
"""
查看持仓、损益和交易记录
"""
import argparse
import json
import os
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(SCRIPT_DIR, "..", "state.json")


def load_state() -> dict | None:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_state(state: dict):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def get_current_price(asset: str) -> float:
    """获取当前价格"""
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

    # 尝试 openctp
    try:
        sys.path.insert(0, SCRIPT_DIR)
        from get_price import get_price_via_openctp
        data = get_price_via_openctp(asset)
        if data and data.get("last_price", 0) > 0:
            return data["last_price"]
    except Exception:
        pass

    # 最终降级
    return 500.0 if asset == "gold" else 45000.0


def show_portfolio():
    """展示持仓和损益"""
    state = load_state()
    if not state:
        print(json.dumps({
            "status": "未初始化",
            "message": "尚未进行任何交易。初始资金 1 亿元，可随时开始交易。",
            "cash": 100_000_000,
            "total_value": 100_000_000,
            "pnl": 0,
            "pnl_percent": "0.00%",
        }, ensure_ascii=False, indent=2))
        return

    gold_price = get_current_price("gold")
    copper_price = get_current_price("copper")

    gold_value = state["gold_qty"] * gold_price
    copper_value = state["copper_qty"] * copper_price
    total = state["cash"] + gold_value + copper_value
    pnl = total - state["initial_cash"]
    pnl_pct = pnl / state["initial_cash"] * 100 if state["initial_cash"] > 0 else 0

    # 计算黄金持仓盈亏
    gold_cost = state["gold_qty"] * state["gold_avg_price"] if state["gold_avg_price"] > 0 else 0
    gold_pnl = gold_value - gold_cost if state["gold_qty"] > 0 else 0

    # 计算铜持仓盈亏
    copper_cost = state["copper_qty"] * state["copper_avg_price"] if state["copper_avg_price"] > 0 else 0
    copper_pnl = copper_value - copper_cost if state["copper_qty"] > 0 else 0

    result = {
        "initial_cash": state["initial_cash"],
        "cash": round(state["cash"], 2),
        "gold": {
            "qty": state["gold_qty"],
            "unit": "克",
            "avg_cost": round(state["gold_avg_price"], 2),
            "current_price": gold_price,
            "market_value": round(gold_value, 2),
            "unrealized_pnl": round(gold_pnl, 2),
        },
        "copper": {
            "qty": state["copper_qty"],
            "unit": "吨",
            "avg_cost": round(state["copper_avg_price"], 2),
            "current_price": copper_price,
            "market_value": round(copper_value, 2),
            "unrealized_pnl": round(copper_pnl, 2),
        },
        "total_value": round(total, 2),
        "pnl": round(pnl, 2),
        "pnl_percent": f"{'+' if pnl_pct >= 0 else ''}{pnl_pct:.2f}%",
        "trade_count": len(state.get("trades", [])),
        "update_time": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))


def show_history():
    """展示交易记录"""
    state = load_state()
    if not state or not state.get("trades"):
        print(json.dumps({"message": "暂无交易记录"}, ensure_ascii=False, indent=2))
        return

    print(json.dumps(state["trades"], ensure_ascii=False, indent=2))


def reset():
    """重置账户到初始状态"""
    state = {
        "initial_cash": 100_000_000,
        "cash": 100_000_000,
        "gold_qty": 0,
        "gold_avg_price": 0,
        "copper_qty": 0,
        "copper_avg_price": 0,
        "trades": [],
    }
    save_state(state)
    print(json.dumps({
        "success": True,
        "message": "账户已重置。初始资金：100,000,000 元，持仓已清空。",
    }, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description="查看持仓和交易记录")
    parser.add_argument("--history", action="store_true", help="查看交易记录")
    parser.add_argument("--reset", action="store_true", help="重置账户到初始状态")
    args = parser.parse_args()

    if args.reset:
        reset()
    elif args.history:
        show_history()
    else:
        show_portfolio()


if __name__ == "__main__":
    main()
