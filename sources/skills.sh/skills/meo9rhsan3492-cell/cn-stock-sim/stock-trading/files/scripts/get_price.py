#!/usr/bin/env python3
"""
A股实时行情查询
数据来源：新浪财经免费接口（无需注册、无需API Key、国内直连）
"""
import argparse
import json
import sys
import urllib.request


def get_sina_quote(code):
    """从新浪财经获取单只股票实时行情"""
    if code.startswith(("sh", "sz")):
        sina_code = code
    elif code.startswith(("6", "9", "5")):
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
    except Exception as e:
        return {"error": "network_fail", "message": str(e)}

    if '"' not in text:
        return {"error": "parse_fail"}

    data_str = text.split('"')[1]
    if not data_str:
        return {"error": "no_data", "message": "stock code " + code + " returned empty"}

    fields = data_str.split(",")
    if len(fields) < 32:
        return {"error": "incomplete_data"}

    try:
        name = fields[0]
        open_price = float(fields[1]) if fields[1] else 0
        pre_close = float(fields[2]) if fields[2] else 0
        last_price = float(fields[3]) if fields[3] else 0
        high = float(fields[4]) if fields[4] else 0
        low = float(fields[5]) if fields[5] else 0
        volume = int(float(fields[8])) if fields[8] else 0
        amount = float(fields[9]) if fields[9] else 0
        buy1_vol = int(float(fields[10])) if fields[10] else 0
        buy1 = float(fields[11]) if fields[11] else 0
        sell1 = float(fields[21]) if fields[21] else 0
        sell1_vol = int(float(fields[20])) if fields[20] else 0
        date_str = fields[30] if len(fields) > 30 else ""
        time_str = fields[31] if len(fields) > 31 else ""
    except (ValueError, IndexError) as e:
        return {"error": "parse_exception", "message": str(e)}

    if last_price <= 0:
        return {"error": "no_price", "message": name + " no live data, may be outside trading hours"}

    change = round(last_price - pre_close, 2) if pre_close > 0 else 0
    change_pct = round(change / pre_close * 100, 2) if pre_close > 0 else 0
    sign = "+" if change_pct >= 0 else ""

    vol_display = str(round(volume / 10000)) + " wan shares" if volume >= 10000 else str(volume) + " shares"
    amt_display = str(round(amount / 100000000, 2)) + " yi" if amount >= 100000000 else str(round(amount / 10000)) + " wan"

    return {
        "code": code,
        "name": name,
        "last_price": last_price,
        "open": open_price,
        "pre_close": pre_close,
        "high": high,
        "low": low,
        "change": change,
        "change_percent": sign + str(change_pct) + "%",
        "volume": volume,
        "volume_display": vol_display,
        "amount": amount,
        "amount_display": amt_display,
        "buy1": buy1,
        "buy1_volume": buy1_vol,
        "sell1": sell1,
        "sell1_volume": sell1_vol,
        "date": date_str,
        "time": time_str,
        "source": "sina_finance_realtime",
    }


def main():
    parser = argparse.ArgumentParser(description="A-share realtime quote")
    parser.add_argument("--code", type=str, help="Stock code(s), comma separated. e.g. 600519,000858")
    parser.add_argument("--index", type=str, help="Index code. e.g. sh000001")
    args = parser.parse_args()

    if args.index:
        result = get_sina_quote(args.index)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif args.code:
        codes = [c.strip() for c in args.code.split(",") if c.strip()]
        if len(codes) == 1:
            print(json.dumps(get_sina_quote(codes[0]), ensure_ascii=False, indent=2))
        else:
            results = [get_sina_quote(c) for c in codes]
            print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
