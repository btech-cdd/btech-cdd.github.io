(function () {
  IMPORTED_FEATURE = {};
  let rWindowSpeedGrader = /^\/courses\/[0-9]+\/gradebook\/speed_grader/;
  if (rWindowSpeedGrader.test(window.location.pathname)) {
    IMPORTED_FEATURE = {
      attempts: 0,
      initiated: false,
      courseId: ENV.course_id,
      assignmentId: ENV.assignment_id,
      studentId: "",
      rSpeedgrader: /courses\/([0-9]+)\/gradebook\/speed_grader\?assignment_id=([0-9]+)&student_id=([0-9]+)/,
      _init(params = {}) {
        let feature = this;
        feature.insertAttemptsData();
        $(".save_rubric_button").on("click", function () {
          feature.calcAttemptsData(new Date());
        });
      },
      async insertAttemptsData() {
        let feature = this;
        let details;
        if (rWindowSpeedGrader.test(window.location.pathname)) {
          details = await getElement("#grade_container");
        }
        details.after(
          `<tr id="btech-attempts-data" class="content_box">
          <td colspan="3">
          <div id="btech-recorded-attempts"><b>Recorded Attempts:</b> <span id="btech-recorded-attempts-value"></span></div>
          <div id="btech-rubric-score"><b>Rubric Score:</b> <span id="btech-rubric-score-value"></span></div>
          <div id="btech-suggested-score"><b>Suggested Score:</b> <span id="btech-suggested-score-value"></span></div>
          </td>
          </tr>`);
        feature.calcAttemptsData();
      },
      async calcAttemptsData(setTime = null) {
        let feature = this;
        //GET URL DATA
        //this is done here because the url changes in speedgrader, so a one time set won't work
        let pageurl = (window.location.pathname + window.location.search);
        console.log(pageurl);
        let urlData = pageurl.match(feature.rSpeedgrader);
        console.log(urlData);
        feature.courseId = urlData[1];
        feature.assignmentId = urlData[2];
        feature.studentId = urlData[3];

        //Get submission data to calculate previous attempts and currents core
        feature.attempts = 0;
        let url = "/api/v1/courses/" + feature.courseId + "/assignments/" + feature.assignmentId + "/submissions/" + feature.studentId;
        let comments = [];
        let data = await canvasGet(url, {
          include: [
            'submission_comments',
            'rubric_assessment'
          ]
        });
        console.log(data);
        comments = data[0].submission_comments;
        let checkTimeDif = (setTime == null);
        for (let c = 0; c < comments.length; c++) {
          let comment = comments[c];
          if (comment.comment.includes("RUBRIC")) {
            feature.attempts += 1;
          }
          if (setTime !== null) {
            let timeDif = setTime - new Date(comment.created_at);
            if (timeDif < 10000) {
              checkTimeDif = true;
            }
          }
        }
        if (checkTimeDif === false) {
          feature.calcAttemptsData(setTime);
        } else {
          if (feature.attempts > 0) {
            rubricTotal = 0;
            for (c in data[0].rubric_assessment) {
              let criterion = data[0].rubric_assessment[c];
              rubricTotal += criterion.points;
            }
            rubricMax = ENV.rubric.points_possible;
            let suggestedScore = Math.round(rubricTotal * ((11 - feature.attempts) / 10));
            $("#btech-recorded-attempts-value").text(feature.attempts);
            $("#btech-rubric-score-value").text(rubricTotal + " (" + (Math.round((rubricTotal / rubricMax) * 1000) / 10) + "%)");
            $("#btech-suggested-score-value").text(suggestedScore);
          }
        }
      }
    }
  }
})();