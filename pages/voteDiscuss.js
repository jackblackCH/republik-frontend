import ElectionDiscussionPage from '../components/Vote/ElectionDiscussionPage'
import withData from '../lib/apollo/withData'
import { compose } from 'react-apollo'
import { enforceMembership } from '../components/Auth/withMembership'
import withMe from '../lib/apollo/withMe'

export default compose(
  withData,
  enforceMembership,
  withMe
)(ElectionDiscussionPage)
