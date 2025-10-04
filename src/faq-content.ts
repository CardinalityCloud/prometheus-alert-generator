export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  icon?: 'github' | 'bug' | 'mail' | 'help';
}

export const faqItems: FaqItem[] = [
  {
    id: 'contribute',
    question: 'How do I contribute to this project?',
    icon: 'github',
    answer: `We welcome contributions! This project is open source under the Apache 2.0 license.

To contribute:

- Fork the repository at [GitHub](https://github.com/CardinalityCloud/prometheus-alert-generator)
- Read our [Contributing Guidelines](https://github.com/CardinalityCloud/prometheus-alert-generator/blob/main/CONTRIBUTING.md)
- Create a feature branch
- Make your changes and write tests if applicable
- Submit a pull request`,
  },
  {
    id: 'issues',
    question: 'How do I report a bug or request a feature?',
    icon: 'bug',
    answer: `We use GitHub Issues to track bugs and feature requests.

To report a bug or request a feature:

- Visit our [Issues page](https://github.com/CardinalityCloud/prometheus-alert-generator/issues)
- Search existing issues to avoid duplicates
- Click "New Issue" and provide detailed information
- For bugs: include steps to reproduce, expected vs actual behavior
- For features: describe the use case and desired functionality`,
  },
  {
    id: 'contact',
    question: 'How do I contact Cardinality Cloud?',
    icon: 'mail',
    answer: `You can reach Cardinality Cloud through multiple channels:

- Email: [jjneely@cardinality.cloud](mailto:jjneely@cardinality.cloud)
- Website: [cardinality.cloud](https://cardinality.cloud/)
- For general feedback about this tool, use the feedback email above

We'd love to hear your thoughts on how we can improve this tool!`,
  },
  {
    id: 'what-is-slo',
    question: 'What is an SLO and why should I use SLO-based alerts?',
    icon: 'help',
    answer: `An SLO (Service Level Objective) is a target reliability goal for your service, expressed as a percentage (e.g., 99.9% uptime).

SLO-based alerting has several advantages:

- Focuses on user-facing reliability rather than arbitrary thresholds
- Uses multi-window burn rate detection to alert on issues at the right time
- Reduces alert fatigue by only notifying when error budget is at risk
- Helps balance reliability with development velocity`,
  },
];
