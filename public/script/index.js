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
    const keywords = nluResponse.results.result.keywords;

    var highestValue = getHighestValue(emotion);

    if (highestValue[0] == undefined) {
        resetEmotion();
        return;
    }
    $('#emotion').css('background-image', ' url("/img/emotion/' + highestValue[0] + '.svg")');
    $('#emotion-text').text('Your question has lots of ' + highestValue[0]);

    setEmotions(emotion);
    addKeywords(keywords);
}

function addKeywords(obj) {
    var keywords = [];
    $(obj).each(function () {
        const keyword = '<div class="keyword" name="' + this.text + '">' + this.text + '</div>';
        console.log($('[name="' + this.text + '"'))
        if ($('[name="' + this.text + '"').length == 0) {
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

function resetEmotion() {
    $('#emotion-text').text('Ask a question in the text field above!');
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
    return [item, max];
}

function setEmotions(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            $('#' + key + '-inner').css('width', (obj[key] * 100) + '%');
        }
    }
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