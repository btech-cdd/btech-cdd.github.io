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
        try {
          assignmentReviewData = await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/courses/${ENV.COURSE_ID}/quizzes/${ENV.ASSIGNMENT.id}`);
        } catch (err) {
          console.log(err);
          return false;
        }
        assignmentCriteria = (await getCriteria('Quizzes'))['Quizzes'];
      } 
      // Regular Assignments
      else {
        assignmentData = (await canvasGet(`/api/v1/courses/${ENV.COURSE_ID}/assignments/${ENV.ASSIGNMENT_ID}`))[0];
        assignmentCriteria = (await getCriteria('Assignments'))['Assignments'];
        rubricCriteria = (await getCriteria('Rubrics'))['Rubrics'];
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

    // do we have a review?
    async function generateDetailedContent(type, contentData, rubricData, contentCriteria, rubricCriteria, objectivesData) {
      let html = `
      <div style="background-color: white; font-weight: bold; font-size: 1.5rem; padding: 0.5rem; border: 1px solid #AAA;">Course Evaluation</div>
      <div style="background-color: white; border-bottom: 1px solid #AAA;">
        <div 
          v-for="(menu, m) in menuOptions" :key="m"
          :style="{
            'color': menuCurrent == menu ? '${bridgetools.colors.blue}' : '',
            'background-color': menuCurrent == menu ? '#F0F0F0' : '',
            'font-weight': menuCurrent == menu ? 'bold' : 'normal'
          }"
          style="
            text-align: center;
            display: inline-block;
            padding: 0.25rem 1rem;
            font-weight: bold;
            font-size: 1rem;
            cursor: pointer;
            user-select: none;
            "
          @click="setMenu(menu)"
        >{{menu.toUpperCase()}}</div>
      </div>
      <div v-if="menuCurrent == 'main'">
        <div class="btech-course-evaluator-content-box">
          <h2>Relevant Objectives</h2>
          <div :style="{
            color: contentData.objectives.includes(objective.objective_id) ? '#000' : '#CCC' 
          }" v-for="objective in objectivesData">
          <span style="width: 1rem; display: inline-block;">{{contentData.objectives.includes(objective.objective_id) ? '&#10003;' : ''}}</span>
          {{objective.objective_text}}
          </div>
        </div>
        <div class="btech-course-evaluator-content-box">
          <h2>Content Review</h2>
          <div v-for="(criterion, criterionName) in contentCriteria" :title="criterion.description">
            <span style="font-size: 0.75rem; width: 8rem; display: inline-block;">{{criterion.name}}</span>
            <span>
              {{calcEmoji(contentData, contentCriteria, criterionName)}}
            </span>
          </div>
          <div v-if="contentData.objectives" title="The content is alligned to the course objectives.">
            <span style="font-size: 0.75rem; width: 8rem; display: inline-block;">Allignment</span><span>{{ ((contentData?.objectives ?? []) > 0 ? emojiTF[1] : emojiTF[0])}}</span>
          </div>
        </div>

        <div class="btech-course-evaluator-content-box">
          <div title="Additional feedback generated by the AI reviewer" style="margin-top: 0.5rem; display: inline-block;">
            <h2>AI Feedback</h2>
            <p>{{contentData.feedback}}</p>
          </div>
        </div> 
      </div>
      `;
      $("#btech-course-reviewer-detailed-report").append(html);
      let APP = new Vue({
        el: '#btech-course-reviewer-detailed-report',
        created: async function () {
          this.contentCriteria = sortCriteria(this.contentCriteria);
          console.log(this.contentCriteria);
          this.rubricCriteria = sortCriteria(this.rubricCriteria);
        },
        data: function () {
          return {
            emoji: emoji,
            emojiTF: emojiTF,
            sortCriteria: sortCriteria,
            courseId: ENV.COURSE_ID,
            objectivesData: objectivesData,
            contentData: contentData,
            rubricData: rubricData,
            contentCriteria: contentCriteria,
            rubricCriteria: rubricCriteria,
            courseCode: courseCode,
            year: year,
            menuCurrent: 'main',
            menuOptions: [
              'main',
            ],
          }
        },
        methods: {
          setMenu(menu) {
            this.menuCurrent = menu;
            this.genBloomsChart(this.bloomsCounts);
          },
          calcEmoji(data, criteria, criterionName) {
            let criterion = criteria[criterionName];
            let val = data?.criteria?.[criterionName] ?? 0;
            if (criterion.score_type == 'boolean') {
              return (val ? emojiTF[1] : emojiTF[0]);
            }
            if (criterion.score_type == 'number') {
              return (emoji?.[val] ?? '');
            }
            return '';
          }
        }
      });
      return APP;
    }

    await refreshData();
   // Function to create and position the custom context menu
   // Function to create and position the custom context menu

    if (assignmentReviewData?.assignment_id == undefined) return;
    let $detailedReportButton = addDetailedReportButton();
    generateDetailedContent('Assignments', assignmentReviewData, rubricReviewData, assignmentCriteria, rubricCriteria, objectivesData);
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
      }},
      // { id: 'clearReview', text: 'Clear Review', func: () => {}}
    ]);


    let data = assignmentReviewData;
    let averageScore = calcCriteriaAverageScore(data, assignmentCriteria);
    console.log(rubricReviewData);
    let averageRubricScore = calcCriteriaAverageScore(rubricReviewData, rubricCriteria);
    if (data.ignore) $detailedReportButton.html('🚫');
    else {
      $detailedReportButton.html(`<div class="btech-course-reviewer-assignment-score-left" style="position: absolute; clip-path: inset(0 50% 0 0);">${emoji?.[averageScore]}</div><div class="btech-course-reviewer-assignment-score-right" style="clip-path: inset(0 0 0 50%);">⚪</div>`);
      $(`.btech-course-reviewer-assignment-score-right`).html(
          `${emoji?.[averageRubricScore]}`
      );
    }
  });
})();