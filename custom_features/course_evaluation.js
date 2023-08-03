// track which pages were reviewed, or have an option to tag the current page as needing review
//// maybe a little flag icon next to each topic that you can flag that page as an example. When you click flag, pop up to leave a comment why flagging.
//// option to delete flags
// need to add comments


(function() {
  $('body').append(`
  <div
    id="btech-course-evaluation-vue"
    :style="{
      'width': width + 'px',
      'right': minimized ? '-' + width + 'px' : '0px'
    }"
    style="
      position: fixed; 
      top: 0;
      overflow: scroll;
      height: 100vh;
      background-color: #e8e8e8;
      box-shadow: -1px 0px 10px 0.5px #aaaaaa;
      z-index: 999999;
    "
  >
    <div
      v-if="minimized"
      @click="maximize"
      style="
        position: fixed;
        top: 2rem;
        right: 0px;
        color: white;
        padding: 0.5rem;
        cursor: pointer;
      "
      :style="{
        'background-color': bridgetools.colors.red
      }"
    >
      <i class="icon-rubric"></i>
    </div>
    <div
      v-else
    >
      <div 
        style="
          text-align: center;
          background-color: white;
          color: black;
          cursor: pointer;
          user-select: none;
        "
        @click="minimize"
      >
        <b>Course Review</b>
        <b>&#8250;</b>
      </div>
      <div
        :style="{
          'background-color': bridgetools.colors.red,
          'color': 'white'
        }"
        style="
          display: grid;
          grid-template-columns: auto auto auto;
          text-align: center;
          user-select: none;
        "
      >
        <span 
          :style="{
            'background-color': currentMenu == 'history' ? 'white' : '',
            'color': currentMenu == 'history' ? 'black' : '',
          }"
          @click="currentMenu='history';">History</span>
        <span 
          :style="{
            'background-color': currentMenu == 'new' ? 'white' : '',
            'color': currentMenu == 'new' ? 'black' : '',
          }"
          @click="
            currentMenu = 'new';
            if (Object.keys(activeReview).length == 0) newReview();
          "
        >{{Object.keys(activeReview).length > 0 ? 'Active' : 'New'}}</span>
        <span
          :style="{
            'background-color': currentMenu == 'data' ? 'white' : '',
            'color': currentMenu == 'data' ? 'black' : '',
          }"
          @click="currentMenu = 'data';"
        >Data</span>
      </div>

      <!--Active Review-->
      <div
        v-if="currentMenu == 'new'"
      >
        <div
          v-for="topic, name in (activeReview?.summary ?? [])"
          style="
            padding: 0.5rem;
            margin: 0.5rem;
            background-color: #FFFFFF;
          "
        >
          <h3><strong>{{name}}</strong></h3>
          <div
            v-for="question, text in topic.questions"
            style="
              margin-bottom: 0.5rem;
            "
          >
            <div>
              <i 
                style="border-radius: 1rem; padding: 0.25rem; color: #FFFFFF;"
                :style="{
                  'background-color': question.links ? bridgetools.colors.green : bridgetools.colors.black
                }"
                class="icon-pin" @click="pinURL(question.id)"
                :title="question.links"
              ></i>
              <strong :title="question.tip">{{text}}</strong></div>
            <div
              style="
                display: flex;
                justify-content: space-around;
                user-select: none;
              "
            >
              <span 
                style="
                  border: 1px solid #303030;
                  border-radius: 1rem;
                  width: 2rem;
                  height: 2rem;
                  font-size: 1.5rem;
                  text-align: center;
                  cursor: pointer;
                "
                v-for="i in [1, 2, 3, 4]"
                :style="{
                  'background-color': question.rating == i ? averageColor(i) : '#FFFFFF',
                  'color' : question.rating == i ? '#FFFFFF' : '#000000'
                }"
                @click="setRating(question.id, i); question.rating = i;"
              ><b>{{i}}</b></span>
            </div>
          </div>
        </div>
        <!--BUTTONS-->
        <div
          style="
            display:flex;
            justify-content: space-around;
          "
        >
          <span
            style="
              background-color: #FFFFFF;
              color: #000000;
              padding: 0.25rem;
              cursor: pointer;
            "
            @click="discardReview()"
          >Discard</span>
          <span
            style="
              background-color: #d22232;
              color: #FFFFFF;
              padding: 0.25rem;
              cursor: pointer;
            "
            @click="submitReview()"
          >Submit</span>
        </div>
      </div>

      <!--SUMMARY-->
      <div
        v-if="currentMenu == 'history'"
        style="margin-top: 1rem;"
      >
        <!--PAST REVIEWS-->
        <div>
          <div
            v-for="review in pastReviews"
            style="
              padding: 0.5rem;
              margin: 0.5rem;
              background-color: #FFFFFF;
            "
          >
            <div>
              {{review.date}}
              <span
                style="
                  float: right;
                  cursor: pointer;
                  user-select: none;
                "
                @click="deleteReview(review._id)"
              >X</span>
            </div>
            <div
              style="
                display:flex;
                justify-content: space-around;
              "
            >
              <span
                v-for="topic, name in review.summary"
                style="
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  text-align: center;
                  height: 2rem;
                  width: 2rem;
                  border-radius: 1rem;
                "
                :style="{
                  'background-color': averageColor(topic.average)
                }"
              >
                <i 
                  style="
                    color: #FFFFFF;
                  "
                  :class="
                    icons[name]
                  "
                  :title="name + ': ' + topic.average"
                ></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `);
  new Vue({
    el: '#btech-course-evaluation-vue',
    mounted: async function () {
      // init context data
      let canvasCourseData = await $.get("/api/v1/courses/" + CURRENT_COURSE_ID);
      // do a check if there's a valid course code. If not, no need to rate :)
      // may be more accurate to pull based on sis course id 
      let sisCourseId = canvasCourseData.sis_course_id;
      if (sisCourseId == undefined) return; //don't do anything, no need to rate?

      //if can't set the required data, can't do a review
      try {
        const yearPattern = /(\d{4})[A-Z]{2}$/;
        const courseCodePattern = /[A-Z]{4} \d{4}/;

        const year = sisCourseId.match(yearPattern)[1];
        const courseCode = sisCourseId.match(courseCodePattern)[0];

        this.courseCode = courseCode;
        this.courseId = canvasCourseData.id;
        this.raterId = ENV.current_user_id;
        this.year = year;
      } catch (err) {
        console.log(err);
        return;
      }

      let courseData = await bridgetoolsReq(`https://reports.bridgetools.dev/api/courses?course_code=${this.courseCode}&year=${this.year}`)
      console.log(courseData);

      this.loadReviews(init=true);
      this.activeUpdater = setInterval(() => {
        if (Object.keys(this.activeReview).length > 0 && !this.minimized && !this.updating) {
          this.loadReviews();
        }
      }, 1000);
    },
    data: function () {
      return {
        minimized: true,
        updating: false,
        currentMenu: 'history',
        width: 500,
        defaultImg: 'https://bridgetools.dev/canvas/media/image-placeholder.png',
        bridgetools: bridgetools,
        activeUpdater: undefined,
        colors: {
          primary: "#D22232",
          secondary: "#B11121",
          callout: "#F1F1F1",
          font: "#FFFFFF",
          bodyfont: "#000000",
          bg: "#FFFFFF"
        },
        pastReviews: [],
        activeReview: {},
        courseCode: "",
        courseId: "",
        icons: {
          'Assessments': 'icon-rubric',
          'Relevance': 'icon-group',
          'Structure': 'icon-copy-course',
          'Clarity': 'icon-edit'
        },
        raterId: ENV.current_user_id
      }
    },
    methods: {
      initReview: function (review) {
        let summary = {};
        for (let s in review.scores) {
          let score = review.scores[s];
          let question = score.question;
          let topic = question.topic;
          summary[topic.name] = summary?.[topic.name] ?? {
            questions: {},
            average: 0
          };
          let tip = "";
          for (let t in question.tips) {
            tip += question.tips[t] + '\n';
          }
          summary[topic.name].questions[question.text] = summary[topic.name].questions?.[question.text] ?? {
            tip: tip,
            rating: score.rating,
            links: score.links[0],
            id: score._id
          };
        }
        review.summary = summary;

        for (let name in summary) {
          let topic = summary[name];
          count = 0;
          total = 0;
          for (let text in topic.questions) {
            let question = topic.questions[text];
            let rating = question.rating;
            count += 1;
            total += rating;
          }
          let average = total / count;

          topic.average = average;
        }
      },
      maximize: function () {
        $('#wrapper').css('margin-right', this.width + 'px');
        this.minimized = false;
      },
      minimize: function () {
        $('#wrapper').css('margin-right', '0px');
        this.minimized = true;
      },
      setCOmment: async function (socreId, comment) {
        this.updating = true;
        await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/scores/${scoreId}`, {
          comment: comment 
        }, "PUT");
        this.updating = false;
      },
      pinURL: async function (scoreId) {
        let url = window.location.origin + window.location.pathname;
        this.setLink(scoreId, url);
      },
      setLink: async function (scoreId, link) {
        this.updating = true;
        await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/scores/${scoreId}`, {
          links: [link] 
        }, "PUT");
        this.updating = false;
      },
      setRating: async function (scoreId, rating) {
        this.updating = true;
        await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/scores/${scoreId}`, {
          rating: rating
        }, "PUT");
        this.updating = false;
      },
      submitReview: async function () {
        let review = this.activeReview;
        await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/review/${review._id}`, {
          submitted: true 
        }, "PUT");
        this.loadReviews();
      },
      newReview: async function () {
        let review = await bridgetoolsReq(`https://reports.bridgetools.dev/api/reviews/scores/${this.courseCode.replace(" ", "%20")}/new`, {
          year: this.year,
          course_id: this.courseId,
          user_id: this.raterId,
        }, "POST");
        this.initReview(review);
        this.activeReview = review;
      },
      averageColor: function (average) {
        let colors = this.bridgetools.colors;
        return (
          average < 2 ? 
            colors.red : 
            average < 3 ? 
              colors.orange : 
              average < 3.5 ?
              colors.yellow :
              average < 4 ?
                colors.yellowGreen :
                colors.green 
        )
      },
      deleteReview: async function (reviewId) {
        await bridgetoolsReq(
            `https://reports.bridgetools.dev/api/reviews/review/${reviewId}`
            , {}
            , "DELETE"
          );
        this.pastReviews = this.pastReviews.filter(function(review) {
            return review._id !== reviewId;
        });
        //pop it out of the list
      },
      discardReview: async function () {
        this.updating = true;
        let reviewId = this.activeReview._id;
        this.activeReview = {};
        await this.deleteReview(reviewId);
        this.currentMenu = 'history';
        this.updating = false;
      },
      loadReviews: async function (init=false) {
        console.log("GET REVIEWS");
        let reviews = await bridgetoolsReq("https://reports.bridgetools.dev/api/reviews/scores/" + this.courseCode.replace(" ", "%20"));
        console.log(reviews);
        if (this.updating || (this.minimized && !init)) return;
        let pastReviews = [];
        let activeFound = false;
        for (let r in reviews) {
          let review = reviews[r];
          this.initReview(review);

          if (review.submitted) pastReviews.push(review);
          if (!review.submitted && review.rater_id == this.raterId) {
            this.activeReview = review;
            if (init) {
              this.currentMenu = 'new';
            }
            activeFound = true;
            this.maximize();
          }
        }
        if (!activeFound) this.activeReview = {};
        this.pastReviews = pastReviews;
      }
    }
  });
})();