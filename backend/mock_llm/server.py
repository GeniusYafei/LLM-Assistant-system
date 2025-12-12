import json
import random
import time
import uuid
from datetime import datetime, timedelta

from flask import Flask, request, jsonify, Response, stream_with_context

app = Flask(__name__)

# Add a simple root route
@app.route('/')
def home():
    return jsonify({
        "message": "LLM API Server is running",
        "status": "active",
        "endpoints": {
            "chat_stream": "/chat (POST)",
            "chat_no_stream": "/chat_no_stream (POST)", 
            "active_users": "/active_users (GET)",
            "average_latency": "/average_latency (GET)",
            "user_satisfaction": "/user_satisfaction (GET)",
            "retry_rate": "/retry_rate (GET)",
            "tokens_per_second": "/tokens_per_second (GET)",
            "unsafe_messages": "/unsafe_messages (GET)",
            "all_metrics": "/all_metrics (GET)",
            "token_usage_totals": "/telemetry/token_usage_totals (GET)",
            "average_latency_over_time": "/telemetry/average_latency_over_time (GET)",
            "hourly_breakdown": "/telemetry/hourly_breakdown (GET)",
            "request_history": "/telemetry/request_history (GET)"
        }
    })

# Store some dummy data for analytics
analytics_data = {}

# Store historical request data for telemetry
historical_requests = {}

def generate_dummy_analytics(org_name):
    """Generate consistent dummy analytics data for an organization"""
    if org_name not in analytics_data:
        # Initialize with random but consistent values based on org_name
        random.seed(hash(org_name) % 1000)
        analytics_data[org_name] = {
            'active_users': random.randint(50, 500),
            'avg_latency': round(random.uniform(0.1, 2.5), 2),
            'thumbs_up': random.randint(200, 1000),
            'thumbs_down': random.randint(10, 100),
            'retry_rate': round(random.uniform(0.01, 0.15), 3),
            'tokens_per_second': random.randint(100, 1000),
            'unsafe_messages': {
                'Offensive': random.randint(5, 50),
                'Biased': random.randint(3, 30),
                'Inappropriate': random.randint(2, 20),
                'Violent': random.randint(1, 10)
            }
        }
    return analytics_data[org_name]

def generate_llm_response(question, organisation_name):
    """Generate a complete LLM response (used by both streaming and non-streaming endpoints)"""
    responses = [
        f"Thanks for your question about {question.split()[0] if question else 'this topic'}.",
        f"I understand you're from {organisation_name}. ",
        f"This is a complex question that requires careful consideration. ",
        f"Based on available information, I can provide some insights. ",
        f"Please consult with experts at {organisation_name} for specific guidance."
    ]
    return "".join(responses)

def calculate_tokens(text):
    """Calculate approximate token count (rough estimate: 1 token ≈ 4 characters)"""
    return len(text) // 4 + random.randint(1, 10)

def calculate_reasoning_tokens(text):
    """Calculate reasoning tokens (typically 20-50% of output tokens)"""
    output_tokens = calculate_tokens(text)
    return random.randint(int(output_tokens * 0.2), int(output_tokens * 0.5))

def record_request_telemetry(org_name, input_tokens, output_tokens, reasoning_tokens, latency_ms):
    """Record request telemetry for historical analysis"""
    if org_name not in historical_requests:
        historical_requests[org_name] = []
    
    request_data = {
        "timestamp": datetime.now().isoformat(),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "reasoning_tokens": reasoning_tokens,
        "total_tokens": input_tokens + output_tokens + reasoning_tokens,
        "latency_ms": latency_ms
    }
    
    historical_requests[org_name].append(request_data)
    
    # Keep only last 1000 requests per org to prevent memory issues
    if len(historical_requests[org_name]) > 1000:
        historical_requests[org_name] = historical_requests[org_name][-1000:]

def generate_historical_data(org_name, days=90):
    """Generate realistic historical data for an organization"""
    if org_name not in historical_requests or len(historical_requests[org_name]) < 10:
        # Generate some historical data if none exists
        base_time = datetime.now() - timedelta(days=days)
        random.seed(hash(org_name) % 1000)
        
        historical_data = []
        for i in range(days * 24):  # Generate hourly data for the period
            timestamp = base_time + timedelta(hours=i)
            if random.random() < 0.3:  # 30% chance of having a request in this hour
                input_tokens = random.randint(50, 500)
                output_tokens = random.randint(100, 2000)
                reasoning_tokens = random.randint(20, 500)
                latency_ms = random.randint(100, 5000)
                
                historical_data.append({
                    "timestamp": timestamp.isoformat(),
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "reasoning_tokens": reasoning_tokens,
                    "total_tokens": input_tokens + output_tokens + reasoning_tokens,
                    "latency_ms": latency_ms
                })
        
        if org_name not in historical_requests:
            historical_requests[org_name] = []
        historical_requests[org_name].extend(historical_data)
    
    return historical_requests[org_name]

# Example call:
# curl "http://localhost:5000/telemetry/token_usage_totals?organisation_name=acme_corp"
@app.route('/telemetry/token_usage_totals', methods=['GET'])
def token_usage_totals():
    """Token usage totals for different time periods"""
    org_name = request.args.get('organisation_name', 'default_org')
    
    # Generate historical data if needed
    historical_data = generate_historical_data(org_name)
    
    now = datetime.now()
    
    # Filter data for different time periods
    data_7_days = [r for r in historical_data if datetime.fromisoformat(r['timestamp']) > now - timedelta(days=7)]
    data_30_days = [r for r in historical_data if datetime.fromisoformat(r['timestamp']) > now - timedelta(days=30)]
    data_90_days = [r for r in historical_data if datetime.fromisoformat(r['timestamp']) > now - timedelta(days=90)]
    
    # Calculate totals
    total_7_days = sum(r['total_tokens'] for r in data_7_days)
    total_30_days = sum(r['total_tokens'] for r in data_30_days)
    total_90_days = sum(r['total_tokens'] for r in data_90_days)
    
    return jsonify({
        "organisation_name": org_name,
        "metric": "token_usage_totals",
        "periods": {
            "last_7_days": total_7_days,
            "last_30_days": total_30_days,
            "last_90_days": total_90_days
        },
        "breakdown": {
            "input_tokens_7_days": sum(r['input_tokens'] for r in data_7_days),
            "output_tokens_7_days": sum(r['output_tokens'] for r in data_7_days),
            "reasoning_tokens_7_days": sum(r['reasoning_tokens'] for r in data_7_days)
        },
        "timestamp": datetime.now().isoformat()
    })

# Example call:
# curl "http://localhost:5000/telemetry/average_latency_over_time?organisation_name=acme_corp"
@app.route('/telemetry/average_latency_over_time', methods=['GET'])
def average_latency_over_time():
    """Average latency metrics for different time periods"""
    org_name = request.args.get('organisation_name', 'default_org')
    
    # Generate historical data if needed
    historical_data = generate_historical_data(org_name)
    
    now = datetime.now()
    
    # Filter data for different time periods
    data_7_days = [r for r in historical_data if datetime.fromisoformat(r['timestamp']) > now - timedelta(days=7)]
    data_30_days = [r for r in historical_data if datetime.fromisoformat(r['timestamp']) > now - timedelta(days=30)]
    data_90_days = [r for r in historical_data if datetime.fromisoformat(r['timestamp']) > now - timedelta(days=90)]
    
    # Calculate averages
    avg_7_days = sum(r['latency_ms'] for r in data_7_days) / len(data_7_days) if data_7_days else 0
    avg_30_days = sum(r['latency_ms'] for r in data_30_days) / len(data_30_days) if data_30_days else 0
    avg_90_days = sum(r['latency_ms'] for r in data_90_days) / len(data_90_days) if data_90_days else 0
    
    return jsonify({
        "organisation_name": org_name,
        "metric": "average_latency_over_time",
        "periods": {
            "last_7_days_ms": round(avg_7_days, 2),
            "last_30_days_ms": round(avg_30_days, 2),
            "last_90_days_ms": round(avg_90_days, 2)
        },
        "request_counts": {
            "last_7_days": len(data_7_days),
            "last_30_days": len(data_30_days),
            "last_90_days": len(data_90_days)
        },
        "timestamp": datetime.now().isoformat()
    })

# Example call:
# curl "http://localhost:5000/telemetry/hourly_breakdown?organisation_name=acme_corp"
@app.route('/telemetry/hourly_breakdown', methods=['GET'])
def hourly_breakdown():
    """24-hour breakdown of token usage per hour"""
    org_name = request.args.get('organisation_name', 'default_org')
    
    # Generate historical data if needed
    historical_data = generate_historical_data(org_name)
    
    now = datetime.now()
    last_24_hours = now - timedelta(hours=24)
    
    # Filter data for last 24 hours
    recent_data = [r for r in historical_data if datetime.fromisoformat(r['timestamp']) > last_24_hours]
    
    # Group by hour
    hourly_data = {}
    for request in recent_data:
        hour = datetime.fromisoformat(request['timestamp']).replace(minute=0, second=0, microsecond=0)
        hour_key = hour.isoformat()
        
        if hour_key not in hourly_data:
            hourly_data[hour_key] = {
                "total_tokens": 0,
                "request_count": 0,
                "average_latency": 0,
                "latencies": []
            }
        
        hourly_data[hour_key]["total_tokens"] += request['total_tokens']
        hourly_data[hour_key]["request_count"] += 1
        hourly_data[hour_key]["latencies"].append(request['latency_ms'])
    
    # Calculate averages and format response
    hourly_breakdown = []
    for hour, data in sorted(hourly_data.items()):
        avg_latency = sum(data['latencies']) / len(data['latencies']) if data['latencies'] else 0
        hourly_breakdown.append({
            "hour": hour,
            "total_tokens": data['total_tokens'],
            "request_count": data['request_count'],
            "average_latency_ms": round(avg_latency, 2)
        })
    
    # Ensure we have all 24 hours (fill with zeros if needed)
    complete_hourly_breakdown = []
    for i in range(24):
        hour_time = (now - timedelta(hours=23-i)).replace(minute=0, second=0, microsecond=0)
        hour_key = hour_time.isoformat()
        
        existing_data = next((h for h in hourly_breakdown if h['hour'] == hour_key), None)
        if existing_data:
            complete_hourly_breakdown.append(existing_data)
        else:
            complete_hourly_breakdown.append({
                "hour": hour_key,
                "total_tokens": 0,
                "request_count": 0,
                "average_latency_ms": 0
            })
    
    return jsonify({
        "organisation_name": org_name,
        "metric": "hourly_breakdown",
        "time_period": "last_24_hours",
        "breakdown": complete_hourly_breakdown,
        "summary": {
            "total_tokens_24h": sum(h['total_tokens'] for h in complete_hourly_breakdown),
            "total_requests_24h": sum(h['request_count'] for h in complete_hourly_breakdown),
            "average_latency_24h": round(sum(h['average_latency_ms'] for h in complete_hourly_breakdown) / 24, 2)
        },
        "timestamp": datetime.now().isoformat()
    })

# Example call:
# curl "http://localhost:5000/telemetry/request_history?organisation_name=acme_corp&days=7"
@app.route('/telemetry/request_history', methods=['GET'])
def request_history():
    """Raw request history with timestamps, token counts, and latency for aggregation"""
    org_name = request.args.get('organisation_name', 'default_org')
    days = int(request.args.get('days', 7))  # Default to 7 days
    
    # Generate historical data if needed
    historical_data = generate_historical_data(org_name, days=days)
    
    now = datetime.now()
    time_filter = now - timedelta(days=days)
    
    # Filter data for requested period
    filtered_data = [r for r in historical_data if datetime.fromisoformat(r['timestamp']) > time_filter]
    
    return jsonify({
        "organisation_name": org_name,
        "metric": "request_history",
        "time_period_days": days,
        "total_requests": len(filtered_data),
        "requests": filtered_data,
        "aggregation_hint": "Use this data to calculate custom aggregations on your side",
        "timestamp": datetime.now().isoformat()
    })

# [KEEP ALL YOUR EXISTING ENDPOINTS EXACTLY AS BEFORE - chat_stream, chat_no_stream, active_users, etc.]
# Only adding the record_telemetry calls to the chat endpoints:

@app.route('/chat', methods=['POST'])
def chat_stream():
    """Streaming LLM response endpoint"""
    data = request.get_json()
    
    user_name = data.get('user_name', 'anonymous')
    organisation_name = data.get('organisation_name', 'default_org')
    question = data.get('question', '')
    
    # Generate unique ID for this streaming session
    stream_id = str(uuid.uuid4())
    
    # Calculate input tokens (user question)
    input_tokens = calculate_tokens(question)
    
    def generate():
        # Simulate LLM thinking and streaming response
        responses = [
            f"Thanks for your question about {question.split()[0] if question else 'this topic'}.",
            f"I understand you're from {organisation_name}. ",
            f"This is a complex question that requires careful consideration. ",
            f"Based on available information, I can provide some insights. ",
            f"Please consult with experts at {organisation_name} for specific guidance."
        ]
        
        # Track output tokens and sequence
        output_tokens = 0
        reasoning_tokens = 0
        sequence_number = 0
        start_time = time.time()
        
        # Send initial response with metadata
        initial_data = {
            "id": stream_id,
            "sequence_number": sequence_number,
            "message_type": "stream_start",
            "status": "created",
            "user_name": user_name,
            "organisation_name": organisation_name,
            "question": question,
            "llm_answer": "",
            "delta": "",
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "reasoning_tokens": reasoning_tokens,
                "total_tokens": input_tokens + output_tokens + reasoning_tokens
            },
            "timestamp": datetime.now().isoformat()
        }
        yield json.dumps(initial_data) + "\n"
        sequence_number += 1
        
        # Update status to in_progress
        progress_data = {
            "id": stream_id,
            "sequence_number": sequence_number,
            "message_type": "status_update",
            "status": "in_progress",
            "user_name": user_name,
            "organisation_name": organisation_name,
            "question": question,
            "llm_answer": "",
            "delta": "",
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "reasoning_tokens": reasoning_tokens,
                "total_tokens": input_tokens + output_tokens + reasoning_tokens
            },
            "timestamp": datetime.now().isoformat()
        }
        yield json.dumps(progress_data) + "\n"
        sequence_number += 1
        
        # Stream the response chunks
        for i, response in enumerate(responses):
            time.sleep(0.5)  # Simulate processing time
            chunk_tokens = calculate_tokens(response)
            reasoning_chunk_tokens = calculate_reasoning_tokens(response)
            output_tokens += chunk_tokens
            reasoning_tokens += reasoning_chunk_tokens
            
            chunk_data = {
                "id": stream_id,
                "sequence_number": sequence_number,
                "message_type": "stream_delta",
                "status": "in_progress",
                "user_name": user_name,
                "organisation_name": organisation_name,
                "question": question,
                "llm_answer": "".join(responses[:i+1]),  # Cumulative answer
                "delta": response,  # Incremental change
                "usage": {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "reasoning_tokens": reasoning_tokens,
                    "total_tokens": input_tokens + output_tokens + reasoning_tokens
                },
                "timestamp": datetime.now().isoformat()
            }
            yield json.dumps(chunk_data) + "\n"
            sequence_number += 1
        
        # Calculate final latency
        end_time = time.time()
        latency_ms = (end_time - start_time) * 1000
        
        # Record telemetry
        record_request_telemetry(organisation_name, input_tokens, output_tokens, reasoning_tokens, latency_ms)
        
        # Final completion message
        completion_data = {
            "id": stream_id,
            "sequence_number": sequence_number,
            "message_type": "stream_end",
            "status": "completed",
            "user_name": user_name,
            "organisation_name": organisation_name,
            "question": question,
            "llm_answer": "".join(responses),  # Full complete answer
            "delta": "[END]",
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "reasoning_tokens": reasoning_tokens,
                "total_tokens": input_tokens + output_tokens + reasoning_tokens
            },
            "latency_ms": round(latency_ms, 2),
            "timestamp": datetime.now().isoformat()
        }
        yield json.dumps(completion_data) + "\n"
    
    return Response(stream_with_context(generate()), mimetype='application/json')

@app.route('/chat_no_stream', methods=['POST'])
def chat_no_stream():
    """Non-streaming LLM response endpoint"""
    data = request.get_json()
    
    user_name = data.get('user_name', 'anonymous')
    organisation_name = data.get('organisation_name', 'default_org')
    question = data.get('question', '')
    
    # Generate unique ID for this response
    response_id = str(uuid.uuid4())
    
    # Start timing
    start_time = time.time()
    
    # Simulate some processing time
    time.sleep(2)
    
    # Generate complete response
    llm_answer = generate_llm_response(question, organisation_name)
    
    # Calculate tokens
    input_tokens = calculate_tokens(question)
    output_tokens = calculate_tokens(llm_answer)
    reasoning_tokens = calculate_reasoning_tokens(llm_answer)
    total_tokens = input_tokens + output_tokens + reasoning_tokens
    
    # Calculate latency
    end_time = time.time()
    latency_ms = (end_time - start_time) * 1000
    
    # Record telemetry
    record_request_telemetry(organisation_name, input_tokens, output_tokens, reasoning_tokens, latency_ms)
    
    return jsonify({
        "id": response_id,
        "message_type": "complete",
        "status": "completed",
        "user_name": user_name,
        "organisation_name": organisation_name,
        "question": question,
        "llm_answer": llm_answer,
        "delta": llm_answer,  # For non-streaming, delta is the full response
        "usage": {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "reasoning_tokens": reasoning_tokens,
            "total_tokens": total_tokens
        },
        "latency_ms": round(latency_ms, 2),
        "timestamp": datetime.now().isoformat()
    })

# [KEEP ALL YOUR OTHER EXISTING ENDPOINTS - active_users, average_latency, etc.]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)