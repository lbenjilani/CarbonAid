//Add an event listener to the sign-up form to handle submission
document.getElementById('signupForm').addEventListener('submit', function (event) {
    event.preventDefault(); //Prevent the default behavior of form submission(reloading page)
    
    //Extract input values
    const name = event.target.name.value;
    const email =  event.target.email.value;
    const username =  event.target.username.value;
    const password =  event.target.password.value;
    const confirmPassword =  event.target.confirmPassword.value;

    //Check if password and confirm password match
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return; //Stop further processing of the form
    }

    //Send signup data to the backend
    fetch("/singup", {  //Signup refers to the backend endpoint where the form data is sent
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({  name, email, username, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert ("Signup successfu!");
                window.location.href = "/login"; //Redirect to login page
            }   else{
                alert("Signup failed: " + data.message);
            }
        })
        .catch(error => console.error("Error:", error));

});