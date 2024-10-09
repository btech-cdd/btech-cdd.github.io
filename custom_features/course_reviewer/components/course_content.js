(async function() {
  Vue.component('course-content', {
    template: ` 
      <div style="padding: 8px 0;">
        <h2>{{ type }}</h2>
        <div v-for="criterion in activeCriteria" :title="criterion.description">
          <span style="font-size: 0.75rem; width: 8rem; display: inline-block;">{{ criterion.name }}</span><span>{{ calcEmoji(counts[criterion.name.toLowerCase().replace(' ', '_')] / (counts.num_reviews * 2)) }}</span>
        </div>
      </div>
    `,
    props: {
      type: {
        type: String,
        default: '' 
      },
      reviews: {
        type: Object,
        default: () => ({})
      },
      criteria: {
        type: Object,
        default: () => ({})
      },
      calcCounts: {
        type: Function,
        required: true
      }
    },
    computed: {
      activeCriteria: function () {
        let criteria = {};
        for (const [criterionName, criterion] of Object.entries(this.criteria)) {
          if (criterion.active) {
            criteria[criterionName] = criterion;
          }
        }
        return criteria;
      },
      counts() {
        console.log(this.criteria);
        console.log(this.reviews);
        let counts = this.calcCounts(this.reviews, this.criteria);
        console.log(counts);
        return counts;
      }
    },
    data() {
      return {
      }
    },
    created: async function () {
    },

    methods: {
    }
  });
})();