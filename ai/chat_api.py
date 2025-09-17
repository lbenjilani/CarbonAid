from flask import Flask, request, jsonify   # handles requests/responses
from flask_cors import CORS                 # allow frontend to talk to backend
import openai
import os                                   # access environment variables securely

app = Flask(__name__)
CORS(app)                                   # enables CORS so React can talk to backend

# Set API Key (stored in environment variable, not in code)
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route("/chat", methods=["POST"])
def chat():
    # Get the message sent from frontend
    user_message = request.json.get("message")

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    try:
        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant focused on sustainability."},
                {"role": "user", "content": str(user_message)}
            ]
        )

        # ✅ FIXED: Correct way to extract the GPT reply
        return jsonify({"response": response["choices"][0]["message"]["content"]})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
