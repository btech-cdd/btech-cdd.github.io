(function() {
  const WIDTH = 200;
  $('body').append(`
  <div 
    id="btech-editor-vue"
    :style="{
      'width': width + 'px',
      'right': minimized ? '-' + width + 'px' : '0px'
    }"
    style="position: fixed; top: 0; height: 100%; background-color: #f1f1f1;"
  >
    <div
      v-if="minimized"
      @click="maximize"
      style="
        position: absolute;
        top: 2rem;
        background-color: #d22232;
        color: white;
        padding: 0.5rem;
        cursor: pointer;
      "
      :style="{
        'right': width + 'px'
      }"
    >
      <i class="icon-edit"></i>
    </div>
    <div
      v-else
    >
      <div 
        style="
          text-align: center;
          background-color: #d22232;
          color: white;
          cursor: pointer;
          user-select: none;
        "
        @click="minimize"
      >
        BTECH Editor
        <b>&#8250;</b>
      </div>
    </div>
  </div>
  `);
  new Vue({
    el: '#btech-editor-vue',
    mounted: async function () {
      $('#wrapper').css('margin-right', `${this.width}px`);
    },
    data: function () {
      return {
        minimized: false,
        width: 250 
      }
    },
    methods: {
      maximize: function () {
        $('#wrapper').css('margin-right', this.width + 'px');
        this.minimized = false;
      },
      minimize: function () {
        $('#wrapper').css('margin-right', '0px');
        this.minimized = true;
      }
    }
  });
})();