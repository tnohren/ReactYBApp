const React = require('react');
const ReactDOM = require('react-dom');
const Selector = require('./Selector');
const AnswerOption = require('./AnswerOption');

const Questionnaire = function (props) {
    const majorsMinors = JSON.parse(props.responseText);

    const Minors = majorsMinors.filter(obj => {
        return obj.minor == 1;
    });
    Minors.sort(sortArrays)

    const Majors = majorsMinors.filter(obj => {
        return obj.major == 1;
    });
    Majors.sort(sortArrays);

    const Both = [{ id: "major1", type: "Major 1:", val: Majors },
    { id: "major2", type: "Major 2:", val: Majors },
    { id: "minor1", type: "Minor 1:", val: Minors },
    { id: "minor2", type: "Minor 2:", val: Minors },
    { id: "gender", type: "Gender:", val: [{ name: "Male" }, { name: "Female" }, { name: "Other" }] },
    { id: "transportation", type: "Transportation: ", val: [{ name: "Bicycle" }, { name: "Car" }, { name: "Walking" }, { name: "Bus" }] }];

    return (
        <form id="questionnaireForm" onSubmit={this.handleSubmit}>

            <div>
                <p id="questionnaireTitle">Profile Questionnaire</p>
            </div>

            <div id="questionnaireBoxes">
                <div id="questionnaireName">
                    <label>First Name: </label>
                    <input type="text" id="firstName" name="firstName" />

                    <label>Last Name: </label>
                    <input type="text" id="lastName" name="lastName" />
                </div>
                <div id="questionnaireMajorsMinors">
                    {Both.map((category) => <label>{category.type} <Selector key={category.type} value={category.val} class="questionnaireSelector" id={category.id} /></label>)}
                </div>
            </div>

            <div className="inputCentered">
                <input id="submitButton" type="submit" value="Save" onClick={() => { submitAnswers() }} />
            </div>
        </form>
    );
}

module.exports = Questionnaire;

const sortArrays = function (obj1, obj2) {
    if (obj1.name < obj2.name) {
        return -1;
    }
    else if (obj1.name == obj2.name) {
        return 0;
    }
    else {
        return 1;
    }
}

const submitAnswers = function () {
    let firstName = document.getElementById('firstName').value;
    let lastName = document.getElementById('lastName').value;
    let major1 = document.getElementById('major1').value;
    let major2 = document.getElementById('major2').value;
    let minor1 = document.getElementById('minor1').value;
    let minor2 = document.getElementById('minor2').value;
    let gender = document.getElementById('gender').value;

    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", '/saveProfile');
    xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")

    // set HttpRequest Callback Function
    xmlHttp.onloadend = function (e) {
        console.log("successfully ran submitAnswers" + xmlHttp.responseText);
    }

    // Send HTTP Request with parameters
    xmlHttp.send("major1=" + major1 + "&major2=" + major2 + "&minor1=" + minor1 + "&minor2=" + minor2 + "&gender=" + gender + "&firstname=" + firstName + "&lastname=" + lastName);
}