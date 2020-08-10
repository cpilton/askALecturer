var typingTimer, doneTypingInterval = 1000;
var keywords, emotion;
var profile;

var socket = io();

$(document).ready(function () {
    getQuestions();
    getUserCount();
    disablePost();
    $('#question').focus(function () {
        showQuestionModules();
    });
});

//Call the NLU function when the user hasn't typed in the question input field for 1s
function questionInput() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(callNlu, doneTypingInterval);
    disablePost();
}

//Call the Natural Language Understanding Ajax Function
function callNlu() {
    const question = $('#question').val();
    if (question.length < 10) {
        resetEmotion();
        resetKeyword();
        return;
    }
    analyzeText(question);
}

// Display the response from Watson
function nluCallback(nluResponse) {
    emotion = nluResponse.results.result.emotion.document.emotion;
    keywords = nluResponse.results.result.keywords;

    var highestValue = getHighestValue(emotion);

    if (highestValue[0] == undefined) {
        resetEmotion();
        resetKeyword();
        return;
    }
    $('#emotion').css('background-image', ' url("/img/emotion/' + highestValue[0] + '.svg")');
    $('#emotion-text').text('Your question has lots of ' + highestValue[0]);

    setEmotions(emotion);
    addKeywords(keywords);

    enablePost();
}

// Display the Keywords from Watson
function addKeywords(obj) {
    var keywords = [];
    $(obj).each(function () {
        const keyword = '<div class="keyword" name="' + this.text + '">' + this.text + '</div>';
        if ($('[name="' + this.text + '"').length === 0) {
            if ($('#keyword-bottom').text().length > 0 && $('#keyword-bottom').find('.keyword').length === 0) {
                $('#keyword-bottom').text('');
            }
            $('#keyword-bottom').append(keyword);
            $('[name="' + this.text + '"').css('opacity', '1');
        }
        keywords.push(this.text);
    });
    $('.keyword').each(function () {
        if (keywords.indexOf($(this).attr('name')) === -1) {
            $(this).remove();
        }
    });
}

// Reset Watson Emotion back to it's empty state
function resetEmotion() {
    $('#emotion').css('background-image', ' url("/img/question.svg")');
    $('#emotion-text').text('Ask a question in the text field above!');
    setEmotions({anger: 0, disgust: 0, fear: 0, joy: 0, sadness: 0})
}

// Reset Watson Keywords back to it's empty state
function resetKeyword() {
    $('.keyword').remove();
    $('#keyword-bottom').text('No keywords found');
}

// Determine the highest value emotion
function getHighestValue(obj) {
    var item, max = 0;
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (obj[key] > max) {
                max = obj[key];
                item = key;
            }
        }
    }
    return [item, max];
}

// For each emotion, fill the bar to show it's presence
function setEmotions(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            $('#' + key + '-inner').css('width', (obj[key] * 100) + '%');
        }
    }
}

// Requests a response from the Watson Natural language API based on text given
function analyzeText(text) {
    $.ajax({
        method: "POST",
        url: "./api/analyze",
        contentType: "application/json",
        data: JSON.stringify({
            text: text
        })
    }).done(function (data) {
        nluCallback(data);
        return data;
    });
}

// Scrolls down to show the Watson API when a question is typed
function showQuestionModules() {
    $('#ask-container').css('height', '460px');
    setTimeout(function () {
        $('.question-module').css('animation', 'popout .6s ease forwards');
    }, 250);
}

// Gets user information from Google Sign in API
function onSignIn(googleUser) {
    profile = googleUser.getBasicProfile();
    setUserImage(profile.getImageUrl());

    // The ID token you need to pass to your backend
   googleUser.getAuthResponse().id_token;
   
   removeSignIn();
}

// Sets the user image to the Google Profile image
function setUserImage(link) {
    $('#user').css('background-image', 'url("' + link + '")')
}

// Switch to a logged-in state
function removeSignIn() {
    $('#sign-in-warning').hide();
    $('.g-signin2').hide();
    $('#postQuestion').show();
    $('#user').show();
    $('#sign-out').show();
}

// Switch to a log-in state
function showSignIn() {
    $('#sign-in-warning').show();
    $('.g-signin2').show();
    $('#postQuestion').hide();
    $('#sign-out').hide();
    $('#user').hide();
}

// Signs the user out and disconnects the session
function signOut() {
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        showSignIn();
    });
}

// Posts the question to the server
function postQuestion() {
    const data = {
        question: $('#question').val(),
        keywords: keywords,
        emotion: emotion,
        poster: profile
    };
    $.ajax({
        method: "POST",
        url: "./db/addQuestion",
        contentType: "application/json",
        data: JSON.stringify(data)
    });
    resetPage();
}

// Gets questions from the server
function getQuestions() {
    $.ajax({
        url: './db/getQuestions',
        type: 'GET',
        contentType: 'application/json',
        success: function (questions) {
            addQuestionsToHTML(questions);
        }
});
}

// Renders the questions onto the page
function addQuestionsToHTML(questions) {
    var div = '';

    $(questions).each(function() {
        var highestValue = getHighestValue(this.emotion);

        div += '<div class="question">';
        div += '<div class="question-top">'+this.question;
        div += '</div>';
        div += '<div class="question-bottom">';
        div += '<div class="question-time">'+new Date(this.createdAt).toLocaleString();
        div += '</div>';
        div += '<div class="question-asker">Asked By ' + this.poster.ofa;
        div += '<div class="question-asker-image" style="background-image: url(\''+this.poster.Paa+'\')">';
        div += '<div class="question-emotion" style="background-image: url(img/emotion/'+highestValue[0]+'.svg)">'
        div += '</div>';
        div += '</div>';
        div += '</div>';
        div += '</div>';
        div += '</div>';
    });

    $('#questions-container').append(div);
}

// Reset the page to how it was when it was loaded
function resetPage() {
    resetEmotion();
    resetKeyword();
    disablePost();

    $('#question').val('');
    $('#ask-container').css('height','75px');
}

// Retrieves the number of active users
function getUserCount() {
    $.ajax({
        url: './tasks/countUsers',
        type: 'GET',
        contentType: 'application/json',
        success: function (msg) {
            $('#users-online').text(msg.users + ' users online');
        }
    });
}

// Live websocket counting number of users
socket.on('userCount', function (msg) {
    $('#users-online').text(msg + ' User(s) Online');
});

// Live websocket checking for new questions
socket.on('newQuestion', function (msg) {
   addQuestionsToHTML(msg);
});

// Enables ability to post a question
function enablePost() {
    $('#postQuestion').prop("disabled", false);
}

// Disables ability to post a question
function disablePost() {
    $('#postQuestion').prop("disabled", true);
}