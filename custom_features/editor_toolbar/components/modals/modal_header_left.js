(async function() {
  Vue.component('rce-modal-header-left', {
    template: ` 
      <i
        @click="create"
        class="icon-text"
        title="Create a left aligned header at the top of the current modal."
      ></i>
    `,
    props: {
      defaultimg: {
        type: String,
        default: ""
      },
      getContainer: {
        type: Function,
        default: () => {}
      },
      color: {
        type: String,
        default: '#d22232'
      }
    },
    computed: {},
    data() {
      return {
      } 
    },
    created: async function () {
    },

    methods: {
      // CREATES A COMMENT THAT APPEARS IN THE RIGHT MARGIN (PADDING) OF THE PAGE AND MOVES TO THE TOP OF THE ASSOCIATED ELEMENT EVEN ON PAGE RESIZE
      create: function () {
        let editor = tinymce.activeEditor;
        editor.selection.select(editor.selection.getNode(), true);
        editor.selection.collapse(true);
        tinymce.activeEditor.execCommand('mceInsertContent', false, `
          <div style="background-color: #FFFFFF; margin-top: 1rem; border: 1px solid #DDD; padding: 0.5rem;">
            <h2
              style="
                margin-top: -2rem;
                background-color: ${this.color};
                color: #FFFFFF;
                position: relative;
                z-index: 2;
                font-size: 2rem;
                display: inline-block;
                margin-left: -2rem;
                padding-left: 3rem;
                width: 90%;
              " 
            ><strong>HEADER</strong></h2>
            <div>
              <p>CONTENT</p>
            </div>
          </div>
        `)
      },
    },

    destroyed: function () {}
  });
})();
