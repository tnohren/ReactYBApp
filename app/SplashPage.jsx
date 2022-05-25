const React = require('react');
const ReactDOM = require('react-dom');
const UnorderedList = require('./UnorderedList');
const Search = require('./Search');

const gradsArray = [
    'Jenna Reynolds, Design',
    'Trey Nohren, Computer Science'
];

// Search function
function ShowSearch() {

    let majorsMinors = "";
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", '/getAllMajorsMinors');
    xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    // set HttpRequest Callback Function
    xmlHttp.onloadend = function (e) {
        majorsMinors = xmlHttp.responseText;

        ReactDOM.render(
            <Search responseText={majorsMinors} />,
            document.getElementById('middle')
        );
    }
    xmlHttp.send();  
}

// Login function
function GoogleLogin() {
    window.location.href = "/auth/google";
}


/* the main page for the index route of this app */
const SplashPage = function () {
    return (
        <div id="homePage">
            <header>
                <h1 id="classHead">Class of 2020</h1>
                <div className="logoContainer"><img src="https://cdn.glitch.com/f84da1ef-a648-4233-af6d-f359389b0bf8%2Fucdavis_logo_white.png?v=1619565941391" alt="UC Davis"></img></div>
            </header>

            <div id="middle">
                <div className="picContainer"><img src="https://cdn.glitch.com/f84da1ef-a648-4233-af6d-f359389b0bf8%2Fgraduation-3649717.jpg?v=1619565893250" alt="graduation"></img></div>
                <div className="button" id="search" onClick={ShowSearch}>Search</div>
                <div className="button" id="login" onClick={GoogleLogin}>Login</div>
            </div>

            <div id="gradList">
                <p id="congrats">Congrats 2020 Grads!</p>
                <div><UnorderedList items={gradsArray} /></div>
            </div>

            <footer>Made with <a href="https://glitch.com">Glitch</a>!</footer>
        </div>
    );
}

module.exports = SplashPage;