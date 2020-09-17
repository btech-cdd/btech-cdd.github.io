(async function () {
  window.testBlob = null;
  //https://btech.instructure.com/courses/498455/accredidation
  if (window.accredidationLoaded === undefined) {
    window.accredidationLoaded = true;
    if (document.title === "BTECH Accredidation") {
      let rCheckInCourse = /^\/courses\/([0-9]+)/;
      if (rCheckInCourse.test(window.location.pathname)) {
        //Allows printing of an element, may be obsolete
        add_javascript_library("https://cdnjs.cloudflare.com/ajax/libs/printThis/1.15.0/printThis.min.js");
        //convert html to a canvas which can then be converted to a blob...
        add_javascript_library("https://html2canvas.hertzen.com/dist/html2canvas.min.js");
        //and converted to a pdf
        add_javascript_library("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.1.1/jspdf.umd.min.js");
        //which can then be zipped into a file using this library
        add_javascript_library("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.1.1/jspdf.umd.js");
        //and then saved
        add_javascript_library("https://cdn.jsdelivr.net/npm/file-saver@2.0.2/dist/FileSaver.min.js");
        let CURRENT_COURSE_ID = parseInt(window.location.pathname.match(rCheckInCourse)[1]);
        //add in a selector for all students with their grade then only show assignments they've submitted so far???
        $("#content").html(`
  <div id='accredidation' style='display: grid; grid-template-columns: auto 20%;'>
  <div id='accredidation-left'>
      <div>
        <div v-for='group in assignmentGroups'>
          <h2>{{group.name}}</h2>
          <div v-for='assignment in getSubmittedAssignments(group.assignments)'>
            <a style='cursor: pointer;' @click='currentGroup = group; openModal(assignment)'>{{assignment.name}}</a>
          </div>
        </div>
      </div>

      <div v-if='showModal' class='btech-modal' style='display: inline-block;'>
        <div class='btech-modal-content'>
          <div style='float: right; cursor: pointer;' v-on:click='close()'>X</div>
          <div class='btech-modal-content-inner'>
            <h2><a target='#' v-bind:href="'/courses/'+courseId+'/assignments/'+currentAssignment.id">{{currentAssignment.name}}</a></h2>
            <div v-for='submission in submissions'>
              <i class='icon-plus' style='cursor: pointer;' @click='addAssignment(currentGroup, currentAssignment, submission)'></i>
              <i class='icon-download' style='cursor: pointer;' @click='downloadSubmission(currentAssignment, submission)'></i>
              <a target='#' v-bind:href="'/courses/'+courseId+'/assignments/'+currentAssignment.id+'/submissions/'+submission.user.id">{{submission.user.name}} ({{Math.round(submission.grade / currentAssignment.points_possible * 1000) / 10}}%)</a>
            </div>
          </div>
        </div>
      </div>
  </div>

  <div id='accredidation-right' style='width: 100%;'>
    <div style='width: 100%; text-align: center;'>
      <div class='btn' v-if='reportReady()' style='cursor: pointer; display: inline-block; margin: 0 auto;' @click='downloadReport()'>Download</div>
    </div>
    <br>
    <div v-for='(group, groupName) in report'>
      <div v-if='Object.keys(group).length > 0'>
        <b>{{groupName}}</b>
        <div v-for='(assignment, assignmentName) in group' style='padding-left: 10px;'>
          {{assignmentName}}:
          <div v-for='(submission) in assignment.submissions' style='padding-left: 20px;'>
          <i title='processing...' v-if='submission.blob===null' class='icon-warning' style='color: #e22;'></i>
          <i v-else class='icon-check' style='color: #2e2;'></i>
            {{submission.user.name}}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`);
        await $.getScript("https://cdn.jsdelivr.net/npm/vue");
        new Vue({
          el: "#accredidation",
          mounted: async function () {
            let app = this;
            app.courseId = CURRENT_COURSE_ID;
            await $.get("/api/v1/courses/" + app.courseId + "/assignment_groups?include[]=assignments&per_page=100").done(function (data) {
              for (let i = 0; i < data.length; i++) {
                let group = data[i];
                for (let j = 0; j < group.assignments.length; j++) {
                  data[i].assignments[j].submissions = [];
                }
              }
              app.assignmentGroups = data;
            });
            let report = {};
            for (let g in app.assignmentGroups) {
              let group = app.assignmentGroups[g];
              report[group.name] = {};
            }
            app.report = report;
            app.getSubmittedAssignments(app.assignmentGroups);
            let enrollments = await canvasGet("/api/v1/courses/" + app.courseId + "/enrollments", {
              type: [
                'StudentEnrollment'
              ],
              state: [
                'active',
                'completed',
                'inactive'
              ]
            });
            app.enrollments = enrollments;
          },
          data: function () {
            return {
              assignmentGroups: {},
              enrollments: [],
              courseId: null,
              currentUser: '',
              showModal: false,
              submissions: [],
              currentAssignment: {},
              currentGroup: {},
              report: {},
            }
          },
          methods: {
            reportReady() {
              let app = this;
              for (let g in app.report) {
                let group = app.report[g];
                for (let a in group) {
                  let assignment = group[a];
                  for (let s in assignment.submissions) {
                    let submission = assignment.submissions[s];
                    if (submission.blob === null) {
                      return false;
                    }
                  }
                }
              }
              return true;
            },
            getSubmittedAssignments(assignments) {
              let submittedAssignments = [];
              for (let i = 0; i < assignments.length; i++) {
                let assignment = assignments[i];
                if (assignment.has_submitted_submissions) {

                  submittedAssignments.push(assignment);
                }
              }
              return submittedAssignments;
            },
            async downloadSubmission(assignment, submission) {
              let app = this;
              let types = assignment.submission_types;
              if (assignment.quiz_id !== undefined) {
                app.downloadQuiz(assignment, submission);
              }
              if (assignment.rubric != undefined) {
                let url = "/courses/" + app.courseId + "/assignments/" + assignment.id + "/submissions/" + submission.user.id;
                app.createIframe(url, app.downloadRubric, {
                  'submission': submission,
                  'assignment': assignment
                });
              }
              if (types.includes("online_upload")) {
                console.log("SUBMISSION");
                console.log(submission);
                let url = "/api/v1/courses/" + app.courseId + "/assignments/" + assignment.id + "/submissions/" + submission.user.id;
                let assignmentsData = null;
                await $.get(url, function (data) {
                  assignmentsData = data;
                });
                for (let i = 0; i < assignmentsData.attachments.length; i++) {
                  let attachment = assignmentsData.attachments[i];
                  console.log(attachment.url);
                  await app.createIframe(attachment.url);
                }
              }
              //check if nothing has been gotten
              if (false) {
                console.log('assignment type undefined');
              }
            },
            addAssignment(group, assignment, submission) {
              let app = this;
              if (app.report[group.name][assignment.name] == undefined) {
                app.report[group.name][assignment.name] = {
                  'data': assignment,
                  'submissions': []
                };
              }
              app.getBlob(assignment, submission);
              app.report[group.name][assignment.name].submissions.push(submission);
            },
            async downloadRubric(iframe, content, data) {
              content.find("#rubric_holder").show();
              content.find("#rubric_holder").prepend("<div>Submitted:" + data.submission.submitted_at + "</div>");
              content.find("#rubric_holder").prepend("<div>Student:" + data.submission.user.name + "</div>");
              content.find("#rubric_holder").prepend("<div>Assignment:" + data.assignment.name + "</div>");
              content.find("#rubric_holder").css({
                'max-height': '',
                'overflow': 'visible'
              });
              content.find("#rubric_holder").printThis();
            },
            async downloadReport() {
              let app = this;
              let zip = new JSZip();
              for (let groupName in app.report) {
                let group = app.report[groupName];
                for (let assignmentName in group) {
                  let assignment = group[assignmentName];
                  for (let s in assignment.submissions) {
                    let submission = assignment.submissions[s];
                    zip.file(groupName + "/" + assignmentName + "/" + submission.user.name + ".png", submission.blob);
                    zip.file(groupName + "/" + assignmentName + "/" + submission.user.name + ".pdf", submission.pdf);
                    //await app.addSubmissionToZip(groupName, assignment.data, submission, zip);
                  }
                }
              }
              zip.generateAsync({
                type: "blob"
              }).then(function (content) {
                saveAs(content, "report.zip");
              })
            },
            async getBlob(assignment, submission) {
              let app = this;
              let types = assignment.submission_types;
              if (assignment.quiz_id !== undefined) {
                app.getBlobQuiz(assignment, submission);
              }
              if (assignment.rubric != undefined) {
                app.getBlobRubric(assignment, submission);
              }
              if (types.includes("online_upload")) {
                let url = "/api/v1/courses/" + app.courseId + "/assignments/" + assignment.id + "/submissions/" + submission.user.id;
                let assignmentsData = null;
                await $.get(url, function (data) {
                  assignmentsData = data;
                });
                for (let i = 0; i < assignmentsData.attachments.length; i++) {
                  let attachment = assignmentsData.attachments[i];
                  await app.createIframe(attachment.url);
                }
              }
              //check if nothing has been gotten
              if (false) {
                console.log('assignment type undefined');
              }
            },
            async getBlobRubric(assignment, submission) {
              //html2canvas breaks if there's any content external to the source (images, scripts, etc) so you've got to strip out everything but the minimum of what you need
              //a potential future fix to this would be to handle all of the file downloading on a server using node and there are more robus libraries for packaging files that way
              let app = this;
              let id = genId();
              let url = "/courses/" + app.courseId + "/assignments/" + assignment.id + "/submissions/" + submission.user.id;
              let iframe = $('<iframe id="btech-content-' + id + '" style="display: none;" src="' + url + '"></iframe>');
              $("#content").append(iframe);
              let holder = await getElement("#rubric_holder", "#btech-content-" + id);
              holder.show();
              content = holder.find('.rubric_container');
              content.prepend("<div>Submitted:" + submission.submitted_at + "</div>");
              content.prepend("<div>Student:" + submission.user.name + "</div>");
              content.prepend("<div>Assignment:" + assignment.name + "</div>");
              content.css({
                'max-height': '',
                'overflow': 'visible'
              });
              $("#content").append("<div id='test-export-" + id + "'></div>");
              $("#test-export-" + id).append(document.getElementById('btech-content-' + id).contentWindow.document.getElementById('rubric_holder').getElementsByClassName('rubric_container')[0]);
              html2canvas(document.querySelector('#test-export-' + id)).then(canvas => {
                canvas.toBlob(function (blob) {
                  submission.blob = blob;
                });
              });
              $("#btech-content-" + id).remove();
              //comment this part out when ready to start messing with formatting and fixing the images missing.
              $("#test-export-" + id).remove();
            },
            async getBlobQuiz(assignment, submission) {
              let app = this;
              let id = genId();
              let iframe = $('<iframe id="btech-content-' + id + '" style="display: none;" src="/courses/' + app.courseId + '/assignments/' + assignment.id + '/submissions/' + submission.user.id + '?preview=1"></iframe>');
              $("#content").append(iframe);
              let content = await getElement("body", "#btech-content-" + id);
              //update date in the content of the quiz
              content.prepend("<div>Submitted:" + submission.submitted_at + "</div>");
              content.prepend("<div>Student:" + submission.user.name + "</div>");
              content.prepend("<div>Assignment:" + assignment.name + "</div>");
              //THIS IS A TEST
              //add a div, fill it with contents of iframe, probably clean it up a bit, then use that to save the image
              $("#content").append("<div id='test-export-" + id + "'></div>");
              $("#test-export-" + id).append(document.getElementById('btech-content-' + id).contentWindow.document.getElementsByTagName('body')[0]);
              html2canvas(document.querySelector('#test-export-' + id), {
                onrendered: function (canvas) {}
              }).then(canvas => {
                var imgData = canvas.toDataURL(
                  'image/png');
                var doc = new jsPDF('p', 'mm');
                doc.addImage(canvas, 'JPEG', 10, 10);
                submission.pdf = doc;
                doc.save('sample-file.pdf');
                $("#btech-content-" + id).remove();
                //comment this part out when ready to start messing with formatting and fixing the images missing.
                $("#test-export-" + id).remove();
                canvas.toBlob(function (blob) {
                  window.testBlob = blob;
                  submission.blob = blob;
                });
              });
            },
            async downloadQuiz(assignment, submission) {
              let app = this;
              let iframe = $('<iframe id="btech-quiz" style="display: none;" src="/courses/' + app.courseId + '/assignments/' + assignment.id + '/submissions/' + submission.user.id + '?preview=1"></iframe>');
              $("#content").append(iframe);
              let content = await getElement("body", "#btech-quiz");
              //update date in the content of the quiz
              content.prepend("<div>Submitted:" + submission.submitted_at + "</div>");
              content.prepend("<div>Student:" + submission.user.name + "</div>");
              content.prepend("<div>Assignment:" + assignment.name + "</div>");
              content.printThis();
              $("#btech-quiz").remove();
            },
            async createIframe(url, func = null, data = {}) {
              let app = this;
              let id = genId();
              let elId = 'temp-iframe-' + id
              let iframe = $('<iframe id="' + elId + '" style="display: none;" src="' + url + '"></iframe>');
              $("#content").append(iframe);
              let content = await getElement("body", "#" + elId);
              if (func !== null) {
                func(iframe, content, data);
              }
              $("#" + elId).remove();
            },
            async openModal(assignment) {
              let app = this;
              app.showModal = true;
              app.currentAssignment = assignment;
              app.submissions = [];
              if (assignment.submissions.length == 0) {
                let submissions = await canvasGet("/api/v1/courses/" + app.courseId + "/assignments/" + assignment.id + "/submissions", {
                  'include': ['user']
                });
                for (let s in submissions) {
                  submissions[s].blob = null;
                }
                assignment.submissions = submissions;
              }
              app.submissions = app.submittedAssignments(assignment.submissions);
            },
            submittedAssignments(submissions) {
              let output = [];
              for (let i = 0; i < submissions.length; i++) {
                let submission = submissions[i];
                if (submission.workflow_state != "unsubmitted") {
                  output.push(submission);
                }
              }
              return output;
            },
            close() {
              let app = this;
              app.showModal = false;
            }
          }
        });
        let assignmentData = [];
        for (let i = 0; i < assignmentData.length; i++) {
          let group = assignmentData[i];
          $("#content").append("<h2>" + group.name + " (" + group.group_weight + "%)</h2>");
        }
      }
    }
  }
})();