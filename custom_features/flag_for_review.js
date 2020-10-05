
(async function () {
  let canvasbody = $("#application");
  let vueString = `
<div>
  <div
    @mouseover="buttonX = 120;"
    @mouseleave="buttonX = 10;"
    @click="show = !show;"
    style='
      width: 110px;
      margin-right: -140px;
      position:fixed;
      bottom: 60px;
      z-index:1000;
      transition: 0.5s;
      background-color: #49e;
      border: 2px solid #5ae;
      padding: 10px 20px;
      color: #FFF;
      border-radius: 5px;
      cursor: pointer;
      user-select: none;
    '
    :style="{'right': buttonX + 'px'}"
  >
  <i class='fas fa-flag'></i> Flag Page
  </div>
  <div 
    v-if='show' 
    class='btech-modal' 
    style='display: inline-block;'
    @mouseup="dropElement"
  >
    <div 
      class='btech-modal-content' 
      style='left: 2.5%; top: 2.5%; height: 95%; width: 95%; position: absolute; box-sizing: border-box;'
    >
      <div class='btech-modal-content-inner'
        style='height: 100%; position: relative;'
        @mousemove="onMouseMove($event)"
      >
        <h2>Flag Submission Form</h2>
        <select>
          <option value='test'>TEST</option>
        </select>
        <textarea rows='6' width='100%'></textarea>
        <button>Submit</button>
      </div>
    </div>
  </div>
</div>
`;
  canvasbody.after('<div id="btech-course-status-vue"></div>');
  $("#btech-course-status-vue").append(vueString);
  this.APP = new Vue({
    el: '#btech-course-status-vue',
    mounted: async function () {
      let app = this;
      let topics = [];

      await $.get("https://jhveem.xyz/api/topics", function (data) {
        for (let i = 0; i < data.length; i++) {
          let topic = data[i];
          topic.type = 'topic';
          topic.editing = false;
          topics.push(topic);
        }
      });
      app.topics = topics;
      let departments = {};
      let savedData = {};
      await $.get("https://jhveem.xyz/api/departments", function (data) {
        for (let i = 0; i < data.length; i++) {
          let department = data[i];
          savedData[department.departmentId] = department;
        }
      });

      await $.get("/api/v1/accounts/3/sub_accounts?per_page=100", function (data) {
        for (let i = 0; i < data.length; i++) {
          let dept = data[i];
          departments[dept.id] = {
            elX: 0,
            elY: 0,
            data: dept,
            editing: false,
            type: 'department'
          }
          let savedDepartmentData = savedData[dept.id];
          if (savedDepartmentData !== undefined) {
            departments[dept.id].elX = savedDepartmentData.elX;
            departments[dept.id].elY = savedDepartmentData.elY;
          } else {
            app.createDepartmentElement(departments[dept.id]);
          }
        }
      });
      app.departments = departments;
    },
    data: function () {
      return {
        departments: {},
        topics: [],
        currentEl: null,
        currentData: null,
        buttonX: 10,
        show: false,
        moving: false,
        firstClick: null,
        xOffset: null,
        yOffset: null,
      }
    },
    methods: {
      async createDepartmentElement(department) {
        let departmentId = department.data.id;
        $.post("https://jhveem.xyz/api/departments", {
          departmentId: departmentId,
          elX: department.elX,
          elY: department.elY
        });
      },
      async saveDepartmentElement(department) {
        let departmentId = department.data.id;
        $.put("https://jhveem.xyz/api/departments/" + departmentId, {
          departmentId: departmentId,
          elX: department.elX,
          elY: department.elY
        });
      },
      async saveTopicElement(topic) {
        let topicId = topic._id;
        $.put("https://jhveem.xyz/api/topics/" + topicId, {
          title: topic.title,
          elX: topic.elX,
          elY: topic.elY
        });
      },
      removeNewLines(str) {
        return str.replace(/\n/g, " ");
      },
      close() {
        this.show = false;
      },
      grabElement(e, data) {
        let app = this;
        if (data.editing === false) {
          let el = e.target;
          if (e.target !== $("#btech-course-status-vue .btech-modal-content-inner")[0]) {

            app.xOffset = e.pageX - $(el).offset().left;
            app.yOffset = e.pageY - $(el).offset().top;
            console.log($(el).offset());
            console.log(app.xOffset);
            console.log(app.yOffset);
            console.log(e.pageX);
            console.log(e.pageY);
            if (this.currentEl == null) {
              this.currentEl = el;
              this.currentData = data;
            }
            if (!this.moving) {
              if (this.firstClick == el) {
                if (data.type === 'topic') {
                  data.editing = true;
                  setTimeout(function () {
                    $(el).find("input").focus();
                  }, 100);
                }
              }
            }
            this.firstClick = el;
            setTimeout(function () {
              if (app.firstClick == el) {
                app.firstClick = null;
              }
            }, 1000);
          }
        }
      },
      dropElement(e) {
        let app = this;
        if (app.moving === true) {
          app.firstClick = null;
        }
        app.moving = false;
        if (app.currentData !== null) {
          if (app.currentData.type === 'department') {
            app.saveDepartmentElement(app.currentData);
          }
          if (app.currentData.type === 'topic') {
            app.saveTopicElement(app.currentData);
          }
        }
        app.currentEl = null;
        app.currentData = null;
      },
      onMouseMove(e) {
        if (this.currentEl !== null && this.currentData !== null) {
          this.moving = true;
          var container = $("#btech-course-status-vue .btech-modal-content-inner");
          var containerOffset = container.offset();
          var relX = e.pageX - containerOffset.left;
          var relY = e.pageY - containerOffset.top;
          let percX = (relX / container.width() * 100).toFixed(2);
          if (percX > 0 && percX <= 100) this.currentData.elX = percX;
          let percY = (relY / container.height() * 100).toFixed(2);
          if (percY > 0 && percY <= 100) this.currentData.elY = percY;
        }
      }
    }
  });
})();