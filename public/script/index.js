$(document).ready(function () {
    $('#question').focus(function () {
        $('#ask-container').css('height', '200px')
    });
});

function submitQuestion() {
    const question = $('#question').val();
    analyzeText(question)
}

function analyzeText(text) {
    $.ajax({
        method: "POST",
        url: "./api/analyze",
        contentType: "application/json",
        data: JSON.stringify({
            text: text
        })
    }).done(function (data) {
        console.log(data);
    });
}