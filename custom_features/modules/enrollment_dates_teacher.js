(async function() {
  $(".more_user_information fieldset").append(`
    <div id="student_last_attended__component">
      <span style="margin: 0.75rem 0.5rem;">
        <span style="margin: 0.75rem 0px;">
          <span wrap="normal" letter-spacing="normal">
            <b>Set Enrollment End Date</b> 
          </span>
        </span>
        <input id="enrollment-end-date" type="date" value="">
      </span>
    </div>
  `)
  return

  let dateOverride = document.getElementById("date-override");
  let name = $(picker).val();
  let enrollment = users[name];
  $(dateOverride).change(()=>{
    if (startAt != undefined) {
      let startDate = new Date(dateOverride.value);
      //for...reasons, this is a day off
      startDate.setDate(startDate.getDate() + 1);
      $.post("/api/v1/courses/" + ENV.COURSE_ID + "/enrollments",
        {enrollment: {
          start_at: startDate,
          user_id: enrollment.user.id,
          course_section_id: enrollment.course_section_id,
          type: "StudentEnrollment",
          enrollment_state: "active",
          notify: false,

        }}
      );
    }
  });
  let startAt = enrollment?.start_at;
  if (startAt !== undefined) {
    startAt = new Date(startAt);

    var day = ("0" + startAt.getDate()).slice(-2);
    var month = ("0" + (startAt.getMonth() + 1)).slice(-2);

    startAt = startAt.getFullYear()+"-"+(month)+"-"+(day) ;
    dateOverride.value=startAt;
  }

  let users = {}
  let enrollments = await canvasGet(`/api/v1/courses/${ENV.COURSE_ID}/enrollments`, {state: ['active'], type: ['StudentEnrollment']});
  for (let e in enrollments) {
    let enrollment = enrollments[e];
      if (users?.[enrollment.user.name] == undefined) {
      users[enrollment.user.name] = enrollment;
      } else {
          console.log("DUP");
      }
  }
})();