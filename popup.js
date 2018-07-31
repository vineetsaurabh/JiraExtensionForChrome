var jiraIssue;
const baseURL = "https://technia.jira.com/browse/";

function ajax(type, url, data, callbacks={}) {
    if (type === 'GET' && !Object.keys(callbacks).length){
        callbacks = data;
    }
    let req = new XMLHttpRequest();
    for (let event in callbacks) {
        if (callbacks.hasOwnProperty(event)) {
            req.addEventListener(event, callbacks[event]);
        }
    }
    req.open(type, url);
    req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    req.send(data);
}

function runner() {
    let jiraIssueInput = document.getElementById('jiraIssue');
    if (jiraIssueInput.value){
        jiraIssue = jiraIssueInput.value.trim();
    }
    let jiraAttr = setJiraAttr(jiraIssue);
    let project = jiraAttr.group;
    let ticketNumber = jiraAttr.number;
    if (project && ticketNumber) {
		openJiraPage(project, ticketNumber);
	} else {
		openMyDashboard();
	}
}

function setJiraAttr(jiraIssue) {
    var project, ticketNumber, jiraArray;
    if (/^[A-z]+-[0-9]+$/.test(jiraIssue)) {
        jiraArray = jiraIssue.split("-", 2);
        project = jiraArray[0];
        ticketNumber = jiraArray[1];
        localStorage.setItem('project', project);
		localStorage.setItem('ticketNumber', ticketNumber);
    } else if (/^[0-9]+$/.test(jiraIssue)) {
        project = localStorage.getItem('project');
        ticketNumber = jiraIssue;
		localStorage.setItem('ticketNumber', ticketNumber);
    } else {
        project = localStorage.getItem('project');
        ticketNumber = localStorage.getItem('ticketNumber');;
    }
    return {
        group: project,
        number: ticketNumber
    };
}

function openJiraPage(project, ticketNumber) {
    event.preventDefault();
    chrome.tabs.create({
        url: baseURL + project + '-' + ticketNumber
    });
}

function browseIssue(jira) {
    event.preventDefault();
    chrome.tabs.create({
        url: baseURL + jira
    });
}

function openMyDashboard() {
	event.preventDefault();
    chrome.tabs.create({
        url: 'https://technia.jira.com/secure/Dashboard.jspa'
    });
}

function checkLoginStatus(callback) {
    ajax('GET', 'https://technia.jira.com/rest/auth/1/session', {
        load: function(){
            let status = this.status;
            let data = JSON.parse(this.responseText);
            if (status === 200) {
                callback(data.name);
            } else {
                document.getElementById('search').style.visibility = "hidden";
                alertError();
            }
        }
    });
}

function myOpenIssues(user) {
    event.preventDefault();
    let postData = JSON.stringify({
        "jql": "assignee = \"" + user + "\" AND status != Resolved AND status != Closed AND status != Verified AND status != Done", 
        "startAt": 0,
        "maxResults": 100,
        "fields": [
            "summary",
            "status",
            "assignee"
        ]
    });
    ajax('POST', 'https://technia.jira.com/rest/api/latest/search?', postData, {
        load: function () {
            let status = this.status;
            let data = JSON.parse(this.responseText);
            let jirasAssignedToUser = [];
            let select = document.getElementById("jiraDropDown");
            if (this.status !== 200) {
                alertError();
                return;
            }
            data.issues.forEach( function(issue) {
                jirasAssignedToUser.push(issue.key);
            });
            jirasAssignedToUser.reverse();
            jirasAssignedToUser.forEach( function(jira) {
                let element = document.createElement("option");
                element.textContent = jira;
                element.value = jira;
                select.appendChild(element);
            });
        }
    });
}

function alertError() {
    let element = document.getElementsByClassName("body")[0];
    element.className += " errorAlert";
}


window.addEventListener('load', function() {
    checkLoginStatus(function(user){
        myOpenIssues(user);
        let myIssuesDropdown = document.getElementById('jiraDropDown');
        myIssuesDropdown.addEventListener('change', function() {
            jiraIssue = myIssuesDropdown.value;
			browseIssue(jiraIssue);
        });
        document.getElementById('runner').addEventListener('submit', runner);
    });
});
