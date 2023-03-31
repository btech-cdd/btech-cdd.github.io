let upload = $(`
<button class="upload_bank_link btn button-sidebar-wide"><i class="icon-upload"></i> Upload Question Bank</button>
`);
async function createBank(title) {
    $.ajaxSetup({
        headers:{
            'Accept': 'application/json'
        }
    });
    let bank = await $.post(`https://btech.instructure.com/courses/${CURRENT_COURSE_ID}/question_banks`, {
      assessment_question_bank: {title: title}
    });
    delete $.ajaxSettings.headers['Accept'];
    return bank;
  }


function closeUploadQuizBank() {
    $("#uploadQuizBankModal").remove();
}
function processUploadedQuizBank() {
  const fileInput = document.getElementById('fileInput');
	
	const files = fileInput.files;
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let reader = new FileReader();
    let fileName = file.name;
    reader.readAsText(file);
    reader.onload = async function() {
      let lines = reader.result.split("\n");
      let quiz = [];
      let prompt = "";
      let answers = [];
      let correct = "";
      for (l in lines) {
        let line = lines[l];
        let mPrompt = line.match(/^[0-9]+\.(.*)/);
        if (mPrompt) {
            prompt = mPrompt[1];
            continue;
        }
        let mAnswer = line.match(/^\*{0,1}[A-Za-z]\.(.*)/);
        if (mAnswer) {
            answers.push({
                option: mAnswer[1],
                correct: line.charAt(0) == '*'
            });
        }
        if (answers.length > 1 && line == '') {
            let question = {
              prompt: prompt,
              answers: answers
            }
            quiz.push(question);
            prompt = "";
            answers = [];
            correct = "";
        }
      }

      $(".upload-quiz-progress-bar").empty();
      $(".upload-quiz-progress-bar").progressbar({
          value: 0
      });
      let bank = await createBank(fileName);
      for (let q in quiz) {
        let question = quiz[q];
        let answers = [];
        for (let a in question.answers) {
          let answer = question.answers[a];
          answers.push({
            answer_weight: question.correct ? 100 : 0,
            numerical_answer_type: "exact_answer",
            answer_text: answer
          })
        }
        await $.post(`/courses/${CURRENT_COURSE_ID}/question_banks/${bank.assessment_question_bank.id}/assessment_questions`, {
          question: {
            question_name: "MC Question " + q,
            question_type: "multiple_choice_question",
            points_possible: 1,
            question_text: `<p>${question.prompt}</p>`,
            answers: answers
          }
        }); 
        $(".upload-quiz-progress-bar").progressbar({
            value:  q / quiz.length * 100
        });
      }
      closeUploadQuizBank();
    };
  }
}
upload.click(() => {
    $("body").append(`
    <div id='uploadQuizBankModal' class='btech-modal' style='display: inline-block;'>
    <div class='btech-modal-content'>
    <div class='upload-quiz-progress-bar'>
    <button style='float: right;' onclick='closeUploadQuizBank()'>X</button>
    <div class='btech-modal-content-inner'>
    <input type="file" id="fileInput" multiple>
    <button onclick="processUploadedQuizBank()">Upload</button>
    </div>
    </div>
    </div>
    </div>
    `)
});
$(".see_bookmarked_banks").after(upload);

