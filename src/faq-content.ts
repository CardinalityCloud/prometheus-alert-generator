export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  icon?: 'github' | 'bug' | 'mail' | 'help';
}

export const faqItems: FaqItem[] = [
  {
    id: 'what-is-slo',
    question: 'What is an SLO and why should I use SLO-based alerts?',
    icon: 'help',
    answer: `An SLO (Service Level Objective) is a target reliability goal for your service, expressed as a percentage (e.g., 99.9% uptime). SLOs define the level of reliability your users can expect and help you balance reliability with development velocity.

SLO-based alerting has several advantages over traditional threshold-based alerting:

- **User-centric**: Focuses on user-facing reliability rather than arbitrary infrastructure thresholds
- **Context-aware**: Uses multi-window burn rate detection to alert on issues at the right time and severity
- **Reduces noise**: Only alerts when error budget is meaningfully at risk, dramatically reducing alert fatigue
- **Business alignment**: Helps balance reliability investments with feature development velocity
- **Early warning system**: Detects problems before you exhaust your error budget

**Learn More:**

The foundational concepts are covered in the Google SRE books:
- [Service Level Objectives (SRE Book Chapter 4)](https://sre.google/sre-book/service-level-objectives/)
- [Implementing SLOs (SRE Workbook Chapter 2)](https://sre.google/workbook/implementing-slos/)
- [Alerting on SLOs (SRE Workbook Chapter 5)](https://sre.google/workbook/alerting-on-slos/)

For a comprehensive practical guide, see Alex Hidalgo's [Implementing Service Level Objectives](https://www.oreilly.com/library/view/implementing-service-level/9781492076803/) (O'Reilly, 2020), which provides detailed strategies for defining, measuring, and alerting on SLOs in real-world environments.`,
  },
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
];
