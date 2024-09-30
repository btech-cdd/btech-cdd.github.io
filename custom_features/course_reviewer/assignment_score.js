(async function () {
  await Promise.all([
    $.getScript("https://bridgetools.dev/canvas/custom_features/course_reviewer/scripts.js"),
    $.getScript("https://bridgetools.dev/canvas/custom_features/course_reviewer/context_menu.js"),
    $.getScript("https://bridgetools.dev/canvas/custom_features/course_reviewer/detailed_report_button.js")
  ]);

  $(document).ready(async function() {
    var courseData, assignmentData, assignmentReviewData, assignmentCriteria, rubricCriteria, rubricReviewData, objectivesData, relatedAssignments, courseCode, year;
    async function refreshData() {
      // course level data
      courseData  = (await canvasGet(`/api/v1/courses/${ENV.COURSE_ID}`))[0];
      let courseCodeYear = getCourseCodeYear(courseData);
      year = courseCodeYear.year;
      courseCode = courseCodeYear.courseCode;

      //New Quizzes
      if (ENV.ASSIGNMENT?.is_quiz_lti_assignment ?? false) {
        assignmentData = (await canvasGet(`/api/quiz/v1/courses/${ENV.COURSE_ID}/quizzes/${ENV.ASSIGNMENT.id}`))[0];
        console.log(assignmentData);
        try {
          assignmentReviewData = await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/courses/${ENV.COURSE_ID}/quizzes/${ENV.ASSIGNMENT.id}`);
          console.log(assignmentReviewData);
        } catch (err) {
          console.log(err);
          return false;
        }
        assignmentCriteria = await getCriteria('Quizzes');
      } 
      // Regular Assignments
      else {
        assignmentData = (await canvasGet(`/api/v1/courses/${ENV.COURSE_ID}/assignments/${ENV.ASSIGNMENT_ID}`))[0];
        assignmentCriteria = await getCriteria('Assignments');
        rubricCriteria = await getCriteria('Rubrics');
        try {
          assignmentReviewData = await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/courses/${ENV.COURSE_ID}/assignments/${ENV.ASSIGNMENT_ID}`);
        } catch (err) {
          console.log(err);
          return false;
        }
        try {
          rubricReviewData = await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/courses/${ENV.COURSE_ID}/assignments/${ENV.ASSIGNMENT_ID}/rubric`);
        } catch (err) {
          rubricReviewData = undefined;
          console.log(err);
        }
      }

      // objectives
      let objectivesQueryString = '';
      for (let o in assignmentReviewData.objectives) {
        if (o > 0) objectivesQueryString += '&';
        objectivesQueryString += 'objectives[]=' + assignmentReviewData.objectives[o];
      }

      try {
        objectivesData = await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/courses/${courseCode}/year/${year}/objectives`);
      } catch (err) {
        objectivesData = [];
        console.log(err);
      }

      return true;
    }

    function generateDetailedRubricReviewEl() {
      if (rubricReviewData) {
        let criteriaHTML = generateCriteriaHTML(rubricCriteria, rubricReviewData);
        let el = $(`
          <div style="padding: 8px 0;">
            <h2>Rubric Review</h2>
            ${criteriaHTML}
            <div title="Additional feedback generated by the AI reviewer" style="margin-top: 0.5rem; display: inline-block;">
              <h2>AI Feedback</h2>
              <p>${rubricReviewData.feedback}</p>
            </div>
          </div> 

        `);
        return el;
      }
      return $('<div></div>')
    }

    // do we have a review?
    async function generateDetailedContent(containerEl) {
      if (assignmentReviewData) {
        containerEl.append(generateRelevantObjectivesEl(assignmentReviewData, objectivesData));
        containerEl.append(generateDetailedContentReviewEl('Assignment', assignmentCriteria, assignmentReviewData));
        containerEl.append(generateDetailedRubricReviewEl());
        // containerEl.append(generateTopicTagsEl(assignmentReviewData));
      }
    }

    await refreshData();
   // Function to create and position the custom context menu
   // Function to create and position the custom context menu

    if (assignmentReviewData?.assignment_id == undefined) return;
    let $detailedReportButton = addDetailedReportButton(function ($modalContent) {
      generateDetailedContent($modalContent);
      }
    );
    addContextMenu($detailedReportButton, [
      { id: 'reevaluate', text: 'Reevaluate', func: async function () {
        let assignmentId = assignmentData.id;
        if (ENV.ASSIGNMENT?.is_quiz_lti_assignment ?? false) {
          let description = assignmentData.instructions;
          await evaluateNewQuiz(ENV.COURSE_ID, courseCode, year, assignmentId, description);
        } else {
          let description = assignmentData.description;
          let rubric = JSON.stringify(assignmentData.rubric);
          await evaluateAssignment(ENV.COURSE_ID, courseCode, year, assignmentId, description, rubric);
        }
        await refreshData();
      }},
      { id: 'disable', text: 'Toggle Ignore', func: async function () {
        console.log('disable');
      }},
      // { id: 'clearReview', text: 'Clear Review', func: () => {}}
    ]);


    let data = assignmentReviewData;
    console.log(data);
    let averageScore = calcCriteriaAverageScore(data, assignmentCriteria);
    let averageRubricScore = calcCriteriaAverageScore(rubricReviewData, rubricCriteria);
    console.log(averageScore);
    if (data.ignore) $detailedReportButton.html('🚫');
    else {
      $detailedReportButton.html(`<div class="btech-course-reviewer-assignment-score-left" style="position: absolute; clip-path: inset(0 50% 0 0);">${emoji?.[averageScore]}</div><div class="btech-course-reviewer-assignment-score-right" style="clip-path: inset(0 0 0 50%);">⚪</div>`);
      $(`.btech-course-reviewer-assignment-score-right`).html(
          `${emoji?.[rubricAverageScore]}`
      );
    }
  });
})();