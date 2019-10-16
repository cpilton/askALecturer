var typingTimer;
var doneTypingInterval = 1000;

$(document).ready(function () {
    $('#question').focus(function () {
        $('#ask-container').css('height', '200px')
    });
});

function questionInput() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(callNlu, doneTypingInterval);
}

//Call the Natural Language Understanding Ajax Function
function callNlu() {
    const question = $('#question').val();
    if (question.length > 10) {
        analyzeText(question);
    }
}

function nluCallback(nluResponse) {
    console.log(nluResponse);
    const emotion = nluResponse.results.result.emotion.document.emotion;
    console.log(emotion);
    var highestValue = getHighestValue(emotion);
    $('#emotion').css('background-image',' url("/img/emotion/'+highestValue[0]+'.svg")');
}

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
    return [item,max];
}

//Requests a response from the Watson Natural language API based on text given
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