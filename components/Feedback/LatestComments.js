import React from 'react'
import { compose } from 'react-apollo'
import { css } from 'glamor'
import { withComments } from './enhancers'
import withT from '../../lib/withT'
import InfiniteScroll from '../Frame/InfiniteScroll'

import { GENERAL_FEEDBACK_DISCUSSION_ID } from '../../lib/constants'

import {
  CommentTeaser,
  Loader,
  fontStyles,
  linkRule
} from '@project-r/styleguide'

import CommentLink from '../Discussion/CommentLink'

const styles = {
  button: css({
    ...fontStyles.sansSerifRegular21,
    outline: 'none',
    WebkitAppearance: 'none',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    margin: '0 auto 0',
    display: 'block'
  })
}

const LatestComments = ({ t, data, fetchMore }) => {
  return (
    <Loader
      loading={data.loading}
      error={data.error}
      render={() => {
        const { comments } = data
        const { pageInfo, totalCount } = comments
        return (
          <InfiniteScroll
            hasMore={pageInfo.hasNextPage}
            loadMore={() => fetchMore({ after: pageInfo.endCursor })}
            totalCount={totalCount}
            currentCount={comments.nodes.length}
            loadMoreKey={'feed/loadMore/comments'}
          >
            {comments.nodes.map(node => {
              const {
                id,
                discussion,
                preview,
                displayAuthor,
                createdAt,
                updatedAt,
                tags,
                parentIds
              } = node
              const meta =
                (discussion &&
                  discussion.document &&
                  discussion.document.meta) ||
                {}

              return (
                <CommentTeaser
                  key={id}
                  id={id}
                  t={t}
                  displayAuthor={displayAuthor}
                  preview={preview}
                  createdAt={createdAt}
                  updatedAt={updatedAt}
                  tags={tags}
                  parentIds={parentIds}
                  Link={CommentLink}
                  discussion={discussion}
                />
              )
            })}
          </InfiniteScroll>
        )
      }}
    />
  )
}

export default compose(
  withT,
  withComments()
)(LatestComments)
