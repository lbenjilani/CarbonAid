from flask import Flask, request, jsonify   #handles requests/responses
from flask_cors import CORS #Allow frontend to talk to backend
import openai
import os   #access enviornment variables securely

app = Flask(__name__)
CORS(app)   #Enables CORS so React can talj to backend (Flask)


#Set API Key (stored in computer NOT CODE)
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route("/chat", methods=["POST"])   #When react sends a POST Request to /chat this function runs
def chat():
    #Gets the message the user sent from the frontend 
    user_message = request.json.get("message")

    #if no message was included returns an error
    if not user_message:
        return jsonify({"error": "No message provided"}), 400
    
    try:
        #Uses Chat API to generate a response
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role":"system", "content":"You are a helpful assistant focused on sustainability"},    #What the assistant does
                {"role":"user", "content": str(user_message)}
            ]
        )

        #Extract & send back the assistant's reply from OpenAI's response
        return jsonify({"response": response["choices"][0]["messages"]["content"]})
    
    #IF API fAILS
    except Exception as e:
        #If something goes wrong (e.g. no API key, no internet) returns an error message
        return jsonify({"error": str(e)}), 500
    
# Run the Flask app when this script is executed
if __name__ == "__main__":
    app.run(debug=True)
