import sys
import requests

BASE_URL = "http://127.0.0.1:5000"


def test_telemetry_token_usage_totals():
    """Test token usage totals endpoint"""
    print("=" * 60)
    print("Testing Token Usage Totals Endpoint")
    print("=" * 60)

    params = {"organisation_name": "acme_corp"}

    try:
        response = requests.get(f"{BASE_URL}/telemetry/token_usage_totals", params=params)
        response.raise_for_status()
        data = response.json()

        print(f"Status Code: {response.status_code}")
        print(f"Organization: {data['organisation_name']}")
        print("Token Usage Totals:")
        periods = data['periods']
        print(f"  Last 7 days: {periods['last_7_days']:,} tokens")
        print(f"  Last 30 days: {periods['last_30_days']:,} tokens")
        print(f"  Last 90 days: {periods['last_90_days']:,} tokens")

        breakdown = data['breakdown']
        print("7-Day Breakdown:")
        print(f"  Input tokens: {breakdown['input_tokens_7_days']:,}")
        print(f"  Output tokens: {breakdown['output_tokens_7_days']:,}")
        print(f"  Reasoning tokens: {breakdown['reasoning_tokens_7_days']:,}")

        print("✓ Token usage totals test completed successfully\n")

    except requests.exceptions.RequestException as e:
        print(f"✗ Error testing token usage totals: {e}\n")


def test_telemetry_average_latency_over_time():
    """Test average latency over time endpoint"""
    print("=" * 60)
    print("Testing Average Latency Over Time Endpoint")
    print("=" * 60)

    params = {"organisation_name": "tech_company"}

    try:
        response = requests.get(f"{BASE_URL}/telemetry/average_latency_over_time", params=params)
        response.raise_for_status()
        data = response.json()

        print(f"Status Code: {response.status_code}")
        print(f"Organization: {data['organisation_name']}")
        print("Average Latency (ms):")
        periods = data['periods']
        print(f"  Last 7 days: {periods['last_7_days_ms']} ms")
        print(f"  Last 30 days: {periods['last_30_days_ms']} ms")
        print(f"  Last 90 days: {periods['last_90_days_ms']} ms")

        counts = data['request_counts']
        print("Request Counts:")
        print(f"  Last 7 days: {counts['last_7_days']} requests")
        print(f"  Last 30 days: {counts['last_30_days']} requests")
        print(f"  Last 90 days: {counts['last_90_days']} requests")

        print("✓ Average latency over time test completed successfully\n")

    except requests.exceptions.RequestException as e:
        print(f"✗ Error testing average latency over time: {e}\n")


def test_telemetry_hourly_breakdown():
    """Test hourly breakdown endpoint"""
    print("=" * 60)
    print("Testing Hourly Breakdown Endpoint")
    print("=" * 60)

    params = {"organisation_name": "startup_xyz"}

    try:
        response = requests.get(f"{BASE_URL}/telemetry/hourly_breakdown", params=params)
        response.raise_for_status()
        data = response.json()

        print(f"Status Code: {response.status_code}")
        print(f"Organization: {data['organisation_name']}")
        print(f"Time Period: {data['time_period']}")

        summary = data['summary']
        print("24-Hour Summary:")
        print(f"  Total tokens: {summary['total_tokens_24h']:,}")
        print(f"  Total requests: {summary['total_requests_24h']}")
        print(f"  Average latency: {summary['average_latency_24h']} ms")

        print("\nLast 6 hours breakdown:")
        for hour_data in data['breakdown'][-6:]:
            hour_time = hour_data['hour'].split('T')[1][:5]
            print(f"  {hour_time}: {hour_data['total_tokens']:,} tokens, "
                  f"{hour_data['request_count']} requests, "
                  f"{hour_data['average_latency_ms']} ms avg")

        print("✓ Hourly breakdown test completed successfully\n")

    except requests.exceptions.RequestException as e:
        print(f"✗ Error testing hourly breakdown: {e}\n")


def test_telemetry_request_history():
    """Test request history endpoint"""
    print("=" * 60)
    print("Testing Request History Endpoint")
    print("=" * 60)

    params = {"organisation_name": "acme_corp", "days": 2}

    try:
        response = requests.get(f"{BASE_URL}/telemetry/request_history", params=params)
        response.raise_for_status()
        data = response.json()

        print(f"Status Code: {response.status_code}")
        print(f"Organization: {data['organisation_name']}")
        print(f"Time Period: {data['time_period_days']} days")
        print(f"Total Requests: {data['total_requests']}")

        if data['requests']:
            print("\nSample requests (first 3):")
            for i, req in enumerate(data['requests'][:3]):
                time_str = req['timestamp'].split('T')[1][:8]
                print(f"  {i + 1}. {time_str} - {req['total_tokens']} tokens, "
                      f"{req['latency_ms']} ms")

        print("✓ Request history test completed successfully\n")

    except requests.exceptions.RequestException as e:
        print(f"✗ Error testing request history: {e}\n")


# [KEEP ALL YOUR EXISTING TEST FUNCTIONS - test_chat_stream, test_chat_no_stream, etc.]

# New Add
def test_chat_no_stream():
    r = requests.post(f"{BASE_URL}/chat_no_stream", json={
        "user_name": "tester",
        "organisation_name": "almond_org",
        "question": "hello mock"
    })
    r.raise_for_status()
    data = r.json()
    assert "llm_answer" in data
    print("✓ /chat_no_stream ok:", data["llm_answer"][:60])


def test_chat_stream():
    # Simple validation can read multi-line JSON (streaming)
    with requests.post(f"{BASE_URL}/chat", json={
        "user_name": "tester",
        "organisation_name": "almond_org",
        "question": "stream please"
    }, stream=True) as resp:
        resp.raise_for_status()
        lines = list(resp.iter_lines(decode_unicode=True))
        assert len(lines) >= 2
        print(f"✓ /chat stream ok: received {len(lines)} chunks")


# =====================================================================================
def run_all_tests():
    """Run all test functions"""
    print("Starting API Client Tests")
    print("Make sure the server is running on http://localhost:5000")
    print("=" * 60)

    # Test chat endpoints first
    test_chat_no_stream()
    test_chat_stream()

    # Test analytics endpoints
    # test_active_users()
    # test_average_latency()
    # test_user_satisfaction()
    # test_retry_rate()
    # test_tokens_per_second()
    # test_unsafe_messages()
    # test_all_metrics()

    # Test telemetry endpoints
    test_telemetry_token_usage_totals()
    test_telemetry_average_latency_over_time()
    test_telemetry_hourly_breakdown()
    test_telemetry_request_history()

    # Test multiple organizations
    # test_multiple_organizations()

    print("=" * 60)
    print("All tests completed!")


def interactive_test():
    """Interactive testing mode"""
    print("Interactive API Testing Mode")
    print("Available endpoints:")
    print("1. /chat (streaming)")
    print("2. /chat_no_stream")
    print("3. /active_users")
    print("4. /average_latency")
    print("5. /user_satisfaction")
    print("6. /retry_rate")
    print("7. /tokens_per_second")
    print("8. /unsafe_messages")
    print("9. /all_metrics")
    print("10. /telemetry/token_usage_totals")
    print("11. /telemetry/average_latency_over_time")
    print("12. /telemetry/hourly_breakdown")
    print("13. /telemetry/request_history")
    print("0. Run all tests")
    print("q. Quit")

    while True:
        choice = input("\nSelect endpoint to test (1-13, 0, q): ").strip().lower()

        if choice == 'q':
            break
        elif choice == '0':
            run_all_tests()
        elif choice == '1':
            test_chat_stream()
        elif choice == '2':
            test_chat_no_stream()
        # elif choice == '3':
        #     test_active_users()
        # elif choice == '4':
        #     test_average_latency()
        # elif choice == '5':
        #     test_user_satisfaction()
        # elif choice == '6':
        #     test_retry_rate()
        # elif choice == '7':
        #     test_tokens_per_second()
        # elif choice == '8':
        #     test_unsafe_messages()
        # elif choice == '9':
        #     test_all_metrics()
        elif choice == '10':
            test_telemetry_token_usage_totals()
        elif choice == '11':
            test_telemetry_average_latency_over_time()
        elif choice == '12':
            test_telemetry_hourly_breakdown()
        elif choice == '13':
            test_telemetry_request_history()
        else:
            print("Invalid choice. Please try again.")


if __name__ == "__main__":
    # Install required package if not already installed
    try:
        import requests
    except ImportError:
        print("Installing requests package...")
        import subprocess

        subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
        import requests

    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        interactive_test()
    else:
        run_all_tests()
