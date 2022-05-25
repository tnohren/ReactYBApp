const React = require('react');
const ReactDOM = require('react-dom');
const SplashPage = require('./SplashPage');
const Questionnaire = require('./Questionnaire');

/* Verification of email and handling the display after login */
let verified = false;
let firstLogin = false;
const handleDisplay = function () {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    verified = (urlParams.get('verified') == '1');
    firstLogin = (urlParams.get('firstLogin') == '1');

    console.log("Verified: " + urlParams.get("verified"));
    console.log("firstLogin: " + urlParams.get("firstLogin"));

    if (verified == 1) {
        if (firstLogin == 1) {
            let majorsMinors = "";
            let xmlHttp = new XMLHttpRequest();
            xmlHttp.open("GET", '/getAllMajorsMinors');
            xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

            // set HttpRequest Callback Function
            xmlHttp.onloadend = function (e) {
                majorsMinors = xmlHttp.responseText;

                ReactDOM.render(
                    <Questionnaire responseText={majorsMinors} />,
                    document.getElementById('main')
                );
            }

            // Send HTTP Request
            xmlHttp.send();
        }
        else {
            ReactDOM.render(
                // Render logged in homepage
            )
        }
    }
    else {
        ReactDOM.render(
            // Render unlogged in homepage
            <SplashPage />,
            document.getElementById('main')
        )
    }
    console.log
}

handleDisplay();