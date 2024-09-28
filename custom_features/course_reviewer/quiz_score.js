/*
// this should be enough to pull all questions that could possibly appear in the quiz.
// need to probably weight it by the number of questions pulled from each group
//// somehow randomly select some of the questions if it's over x ammount, e.g. pull up to 2x the number of items pulled into the quiz itself.
// then need to pull questions that aren't in a bank separately
*/
(async function () {
  await $.getScript("https://bridgetools.dev/canvas/custom_features/course_reviewer/scripts.js");

  var quizReviewData = {}, quizCriteria = {}, quizData = {};



  //reevaluate button
  let evaluateButton = $(`
    <a class="btn" id="btech-evaluate-button" rel="nofollow" >
      Run Evaluator 
    </a>
  `);
  //button is added after data refresh
  evaluateButton.click(async function() {
    detailedReportButton.hide();
    evaluateButton.hide();
    container.html('evaluating...');
    console.log(quizData);
    await evaluateQuiz(ENV.COURSE_ID, courseCode, year, quizData.id, quizData.description)

    if (await refreshData()) await generateContent(container);

    detailedReportButton.show();
    evaluateButton.show();
  });

  //reevaluate button
  let ignoreButton = $(`
    <a class="btn" id="btech-ignore-evaluation-button" rel="nofollow" >
      Ignore 
    </a>
  `);

  ignoreButton.click(async function() {
    ignoreItem(ENV.COURSE_ID, 'quizzes', quizData.id)
  })

  let detailedReportButton = $(`
    <a class="btn" id="btech-detailed-evaluation-button" rel="nofollow" >
      Detailed Report 
    </a>
  `);
  detailedReportButton.click(async function () {
    $("body").append(`
      <div class='btech-modal' style='display: inline-block;'>
        <!-- ERASE THE DISPLAY PIECE BEFORE GOING LIVE -->
        <div class='btech-modal-content' style='max-width: 800px;'>
          <div class='btech-modal-content-inner'></div>
        </div>
      </div>
    `);
    let modal = $('body .btech-modal');
    modal.on("click", function(event) {
      if ($(event.target).is(modal)) {
          modal.remove();
      }
    });
    let modalContent = $('body .btech-modal-content-inner');
    generateDetailedContent(modalContent);
  });

  async function refreshData() {
    let criteriaData = (await bridgetools.req(`https://reports.bridgetools.dev/api/reviews/criteria/type/Quizzes`));
    quizCriteria = {};
    for (let c in criteriaData) {
      let criterion = criteriaData[c];
      let name = criterionNameToVariable(criterion.name);
      quizCriteria[name] = criterion;
    }

    courseData  = (await canvasGet(`/api/v1/courses/${ENV.COURSE_ID}`))[0];
    quizData = (await canvasGet(`/api/v1/courses/${ENV.COURSE_ID}/quizzes/${ENV.QUIZ.id}`))[0];
    let courseCodeYear = getCourseCodeYear(courseData);
    year = courseCodeYear.year;
    courseCode = courseCodeYear.courseCode;
    try {
      quizReviewData = await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/courses/${ENV.COURSE_ID}/quizzes/${ENV.QUIZ.id}`);
      console.log(quizReviewData);
    } catch (err) {
      console.log(err);
      return false;
    }

    let objectivesQueryString = '';
    for (let o in quizReviewData.objectives) {
      if (o > 0) objectivesQueryString += '&';
      objectivesQueryString += 'objectives[]=' + quizReviewData.objectives[o];
    }

    try {
      objectivesData = await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/courses/${courseCode}/year/${year}/objectives`);
      console.log(objectivesData);
    } catch (err) {
      objectivesData = [];
      console.log(err);
    }

    return true;

  }

  async function generateDetailedContent(containerEl) {
    if (quizReviewData) {
      containerEl.append(generateRelevantObjectivesEl(quizReviewData, objectivesData));
      containerEl.append(generateDetailedContentReviewEl('Quiz', quizCriteria, quizReviewData));
      // containerEl.append(generateTopicTagsEl(quizReviewData));
      // containerEl.append(generateRelatedAssignmentsEl());
    }
  }

  async function generateContent(containerEl) {
    containerEl.empty();
    containerEl.append(generateQuizReviewEl(quizReviewData, quizCriteria));
  }

  let container = $('<div id="btech-course-reviewer-container"></div>');
  await refreshData();
  $('#sidebar_content').append(evaluateButton);
  $("#sidebar_content").append(container);
  $('#sidebar_content').append(detailedReportButton);
  if (quizReviewData?.quiz_id) await generateContent(container);

})();