const React = require('react');
const ReactDOM = require('react-dom');
const Selector = require('./Selector');

const Search = function (props) {
    const majorsMinors = JSON.parse(props.responseText);

    const Minors = majorsMinors.filter(obj => {
        return obj.minor == 1;
    });

    const Majors = majorsMinors.filter(obj => {
        return obj.major == 1;
    });

    const Both = [{ id: "major1", type: "Major 1:", val: Majors },
    { id: "major2", type: "Major 2:", val: Majors },
    { id: "minor1", type: "Minor 1:", val: Minors },
    { id: "minor2", type: "Minor 2:", val: Minors },
    { id: "transportation", type: "Preferred Transportation: ", val: [{ name: "Bicycle" }, { name: "Buss" }, { name: "Car" }, { name: "Walk" }] }];

    return (
        <div>
            <div className="picContainer"><img src="https://cdn.glitch.com/b45b4130-9e0e-42e8-8801-1a33b6ff1741%2Fgraduation-3649717.jpg?v=1591497752866" alt="graduation"></img></div>
            <form id="searchForm">
                <div id="searchCentered">
                    <div>
                        <p id="searchTitle">Search For a Graduate</p>
                        <p id="searchDescription">(Fill one or more boxes)</p>
                    </div>

                    <div id="searchQuestions">
                        <div className="searchBox">
                            <label htmlfor="fname">Graduate's First Name: </label>
                            <input className="sameLine" type="text" id="fname" name="fname" />
                        </div>
                        <div className="searchBox">
                            <label htmlfor="lname">Graduate's Last Name: </label>
                            <input className="sameLine" type="text" id="lname" name="lname" />
                        </div>

                        {Both.map((category) => <div className="searchBox"><label>{category.type}</label><Selector key={category.toString()} value={category.val} class="searchSelector" id={category.id} /></div>)}
                    </div>

                    <div className="inputCentered">
                        <input id="submitButton" type="submit" value="Search" onClick={() => { submitSearch() }} />
                    </div>
                </div>
            </form>
        </div>
    );
}

const submitSearch = function () {
    let firstName = document.getElementById("fname").value;
    let lastName = document.getElementById("lname").value;
    let major = document.getElementById("major1").value;
    let minor = document.getElementById("minor1").value;
    let transport = document.getElementById("transportation").value;
    console.log(firstName, lastName, major, minor, transport);

    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", '/getAttributes');
    xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")

    // set HttpRequest Callback Function
    xmlHttp.onloadend = function (e) {
        console.log("successfully ran submitAnswers" + xmlHttp.responseText);
    }

    // Send HTTP Request with parameters
    xmlHttp.send("firstName=" + firstName + "&lastName=" + lastName + "&major=" + major + "&minor=" + minor + "&transport=" + transport);
}

module.exports = Search;