import React, { PureComponent, Fragment } from 'react'
import { compose, graphql } from 'react-apollo'

import withT from '../../lib/withT'
import timeago from '../../lib/timeago'

import Loader from '../Loader'

import { withDiscussionDisplayAuthor, downvoteComment, upvoteComment, editComment, unpublishComment, isAdmin, query, submitComment, commentsSubscription } from './enhancers'
import DiscussionPreferences from './DiscussionPreferences'

import {
  CommentTreeLoadMore,
  CommentTreeCollapse,
  CommentTreeRow,
  Label,
  colors
} from '@project-r/styleguide'

import mkDebug from 'debug'

const debug = mkDebug('comments')

const SHOW_DEBUG = false

const BlockLabel = ({children}) => <Label style={{display: 'block'}}>{children}</Label>

const mergeCounts = (a, b) => {
  return {
    ...a,
    ...Object.keys(b).reduce(
      (merge, key) => {
        merge[key] = (a[key] || 0) + b[key]
        return merge
      },
      {}
    )
  }
}

class Comments extends PureComponent {
  constructor (...args) {
    super(...args)

    this.state = {
      subIdMap: {
        root: []
      },
      now: Date.now(),
      showPreferences: false,
      maxVisualDepth: 3,
      closedPortals: {}
    }

    this.showPreferences = () => {
      this.setState({
        showPreferences: true
      })
    }

    this.closePreferences = () => {
      this.setState({
        showPreferences: false
      })
    }
  }
  clearSubIds (parentId) {
    this.setState(({subIdMap}) => {
      const { nodes } = this.props.data.discussion.comments

      const subIds = (subIdMap[parentId] || [])
            .filter(id => !nodes.find(c => c.id === id))
      debug('clearSubIds', parentId, subIds)
      return {
        subIdMap: {
          ...subIdMap,
          [parentId]: subIds
        }
      }
    })
  }
  componentDidMount () {
    this.unsubscribe = this.props.subscribe({
      onCreate: (comment, parentId = 'root') => {
        this.setState(({subIdMap}) => {
          const subIds = subIdMap[parentId] || []
          subIds.push(comment.id)

          debug('onCreate', parentId, subIds)
          return {
            subIdMap: {
              ...subIdMap,
              [parentId]: subIds
            }
          }
        })
      }
    })
    this.intervalId = setInterval(() => {
      this.setState({ now: Date.now() })
    }, 30 * 1000)
  }
  componentWillUnmount () {
    this.unsubscribe()
    clearInterval(this.intervalId)
  }
  renderComments (nodes, options = {}) {
    const {
      discussionDisplayAuthor: displayAuthor,
      t,
      fetchMore
    } = this.props

    const {
      now,
      subIdMap,
      maxVisualDepth,
      closedPortals
    } = this.state

    const {
      pendingClosure = [],
      count = 0,
      counts = {},
      moreCounts = {},
      directCounts = {}
    } = options
    const initialState = {
      list: [],
      visualDepth: 1,
      pendingClosure,
      count,
      counts,
      moreCounts,
      directCounts
    }

    const timeagoFromNow = (createdAtString) => {
      return timeago(t, (now - Date.parse(createdAtString)) / 1000)
    }

    const closePending = (accumulator, {next, appendAfter}) => {
      const { counts, moreCounts, directCounts } = accumulator
      const needsClosure = accumulator.pendingClosure
        .filter(([pending]) =>
          !next ||
          next.parentIds.indexOf(pending.id) === -1
        )
        .reverse()

      needsClosure.forEach(([comment, increasedDepth, isRoot]) => {
        if (increasedDepth) {
          accumulator.visualDepth -= 1
          SHOW_DEBUG && accumulator.list.push(<BlockLabel>dec {comment.id.slice(0, 3)}</BlockLabel>)
        }
        const directCount = directCounts[comment.id] || 0
        const subCount = (subIdMap[comment.id] || []).length
        if (comment.comments.directTotalCount + subCount > directCount) {
          const count = counts[comment.id] || 0
          const moreCount = moreCounts[comment.id] || 0
          const leftCount = comment.comments.totalCount - count - moreCount
          comment.parentIds.forEach(id => {
            moreCounts[id] = (moreCounts[id] || 0) + leftCount
          })
          accumulator.count += comment.comments.totalCount - count
          accumulator.list.push(
            <CommentTreeLoadMore
              key={`loadMore${comment.id}`}
              t={t}
              connected={!isRoot}
              visualDepth={isRoot ? 0 : accumulator.visualDepth}
              count={leftCount + subCount}
              onClick={() => {
                fetchMore(comment.id, comment.comments.pageInfo.endCursor, {appendAfter})
                  .then(() => {
                    this.clearSubIds(comment.id)
                  })
              }}
            />
          )
        }
      })
      accumulator.pendingClosure = accumulator.pendingClosure
        .filter((pending) => needsClosure.indexOf(pending) === -1)
    }

    return nodes.reduce((accumulator, comment, index, all) => {
      let prev = all[index - 1]
      const next = all[index + 1]

      const { portal } = accumulator
      if (portal) {
        portal.nodes.push(comment)

        const nextBelongsToPortal = next && portal.parentIds.every(parentId => next.parentIds.indexOf(parentId) !== -1)
        if (nextBelongsToPortal) {
          return accumulator
        }
        // close portal
        const portalId = `portal${portal.parent.id}`
        const portalAccumulator = this.renderComments(
          portal.nodes,
          {
            pendingClosure: [
              [portal.parent, false, true]
            ]
          }
        )
        if (closedPortals[portalId]) {
          accumulator.list.push(
            <CommentTreeLoadMore
              key={`open${portalId}`}
              t={t}
              connected
              visualDepth={portal.visualDepth}
              count={portalAccumulator.count}
              onClick={() => {
                this.setState(({closedPortals}) => ({
                  closedPortals: {
                    ...closedPortals,
                    [portalId]: false
                  }
                }))
              }}
            />
          )
        } else {
          accumulator.list.push(
            <Fragment key={portalId}>
              <CommentTreeCollapse
                t={t}
                visualDepth={accumulator.visualDepth}
                onClick={() => {
                  this.setState(({closedPortals}) => ({
                    closedPortals: {
                      ...closedPortals,
                      [portalId]: true
                    }
                  }))
                }}
              />
              {portalAccumulator.list}
              <div style={{
                marginTop: '-2px',
                borderTop: `2px solid ${colors.primary}`
              }} />
            </Fragment>

          )
        }
        accumulator.count += portalAccumulator.count

        accumulator.counts = mergeCounts(
          accumulator.counts,
          portalAccumulator.counts
        )
        accumulator.moreCounts = mergeCounts(
          accumulator.moreCounts,
          portalAccumulator.moreCounts
        )
        accumulator.directCounts = mergeCounts(
          accumulator.directCounts,
          portalAccumulator.directCounts
        )
        accumulator.portal = undefined

        closePending(accumulator, {
          next,
          appendAfter: comment
        })
        return accumulator
      }

      const prevIsParent = !!prev && comment.parentIds.indexOf(prev.id) !== -1
      const prevIsThread = prevIsParent && prev.comments.directTotalCount === 1

      const nextIsChild = !!next && next.parentIds.indexOf(comment.id) !== -1
      const nextIsThread = nextIsChild && comment.comments.directTotalCount === 1

      const subCount = (subIdMap[comment.id] || []).length
      const hasChildren = comment.comments.totalCount + subCount > 0

      const head = (nextIsChild || hasChildren) && !prevIsThread
      const tail = prevIsThread && !(nextIsChild || hasChildren)
      const otherChild = (
        !nextIsChild && !hasChildren && (
          (comment.parentIds.length === 0) ||
          (!prevIsThread && !nextIsThread)
        )
      )

      SHOW_DEBUG && accumulator.list.push(<BlockLabel>{comment.parentIds.concat(comment.id).map(id => id.slice(0, 3)).join('-')}<br />{JSON.stringify({
        head,
        tail,
        otherChild
      }, null, 2)}</BlockLabel>)
      accumulator.list.push(
        <CommentTreeRow
          key={comment.id}
          t={t}
          visualDepth={accumulator.visualDepth}
          head={head}
          tail={tail}
          otherChild={otherChild}
          comment={comment}
          displayAuthor={displayAuthor}
          onEditPreferences={this.showPreferences}
          isAdmin={isAdmin}
          submitComment={this.props.submitComment}
          editComment={this.props.editComment}
          upvoteComment={this.props.upvoteComment}
          downvoteComment={this.props.downvoteComment}
          unpublishComment={this.props.unpublishComment}
          timeago={timeagoFromNow}
        />
      )

      const { directCounts, moreCounts, counts } = accumulator
      accumulator.count += 1
      comment.parentIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1
      })
      const parentId = comment.parentIds[comment.parentIds.length - 1]
      if (parentId) {
        directCounts[parentId] = (directCounts[parentId] || 0) + 1
      }

      if (nextIsChild) {
        const increaseDepth = !nextIsThread
        if (increaseDepth) {
          if (accumulator.visualDepth + 1 > maxVisualDepth) {
            // open a portal
            accumulator.portal = {
              visualDepth: accumulator.visualDepth,
              parent: comment,
              parentIds: next.parentIds,
              nodes: []
            }
            // return early
            return accumulator
          }
          accumulator.visualDepth += 1
          SHOW_DEBUG && accumulator.list.push(<BlockLabel>inc</BlockLabel>)
        }
        accumulator.pendingClosure.push([
          comment,
          increaseDepth
        ])

        // return early
        return accumulator
      }

      // next not a child
      if (hasChildren) {
        comment.parentIds.forEach(id => {
          moreCounts[id] = (moreCounts[id] || 0) + comment.comments.totalCount
        })
        accumulator.count += comment.comments.totalCount
        accumulator.list.push(
          <CommentTreeLoadMore
            key={`loadMore${comment.id}`}
            t={t}
            connected
            visualDepth={accumulator.visualDepth}
            count={comment.comments.totalCount + subCount}
            onClick={() => {
              fetchMore(comment.id, comment.comments.pageInfo.endCursor)
                .then(() => {
                  this.clearSubIds(comment.id)
                })
            }}
          />
        )
      }

      closePending(accumulator, {
        next,
        appendAfter: comment
      })

      return accumulator
    }, initialState)
  }
  render () {
    const {
      discussionId,
      t,
      data: {loading, error, discussion},
      fetchMore
    } = this.props

    const {
      showPreferences,
      subIdMap
    } = this.state

    return (
      <Loader
        loading={loading}
        error={error}
        render={() => {
          const {totalCount, pageInfo, nodes} = discussion.comments

          const accumulator = this.renderComments(nodes)

          // discussion root load more
          const subCount = subIdMap.root.length

          const tailCount = totalCount - accumulator.count + subCount
          const tail = tailCount > 0 && (
            <CommentTreeLoadMore
              key='loadMore'
              t={t}
              visualDepth={0}
              count={tailCount}
              onClick={() => {
                fetchMore(null, pageInfo.endCursor)
                  .then(() => {
                    this.clearSubIds('root')
                  })
              }}
            />
          )

          const discussionPreferences = showPreferences && (
            <DiscussionPreferences
              key='discussionPreferenes'
              discussionId={discussionId}
              onClose={this.closePreferences}
            />
          )

          return (
            <Fragment>
              {accumulator.list}
              <br />
              {tail}
              {discussionPreferences}
            </Fragment>
          )
        }}
      />
    )
  }
}

export default compose(
  withT,
  withDiscussionDisplayAuthor,
  upvoteComment,
  downvoteComment,
  editComment,
  unpublishComment,
  isAdmin,
  submitComment,
  graphql(query, {
    props: ({ownProps: {discussionId, orderBy}, data: {fetchMore, subscribeToMore, ...data}}) => ({
      data,
      fetchMore: (parentId, after, {appendAfter} = {}) => {
        return fetchMore({
          variables: {discussionId, parentId, after, orderBy},
          updateQuery: (previousResult, {fetchMoreResult: {discussion}}) => {
            let nodes = previousResult.discussion.comments.nodes
            const nodeIndex = nodes.reduce(
              (index, node) => {
                index[node.id] = node
                return index
              },
              {}
            )

            const newNodes = discussion.comments.nodes
              .filter(node => !nodeIndex[node.id])
            if (!parentId) {
              nodes = nodes.concat(newNodes)
            } else {
              const parentIndex = nodes.indexOf(nodeIndex[parentId])
              const parent = nodes[parentIndex]
              nodes = [
                ...nodes.slice(0, parentIndex),
                {
                  ...parent,
                  comments: {
                    ...discussion.comments,
                    nodes: undefined
                  }
                },
                ...nodes.slice(parentIndex + 1)
              ]
              let appendIndex = parentIndex
              if (appendAfter) {
                appendIndex = nodes.indexOf(nodeIndex[appendAfter.id])
              }
              nodes.splice(appendIndex + 1, 0, ...newNodes)
            }

            return {
              ...previousResult,
              discussion: {
                ...previousResult.discussion,
                ...discussion,
                comments: {
                  ...previousResult.discussion.comments,
                  // only update total and page info if root
                  ...(parentId ? {} : discussion.comments),
                  nodes
                }
              }
            }
          }
        })
      },
      subscribe: ({onCreate}) => {
        return subscribeToMore({
          document: commentsSubscription,
          variables: {
            discussionId
          },
          onError (...args) {
            debug('subscribe:onError', args)
          },
          updateQuery: (previousResult, { subscriptionData }) => {
            const { node: comment, mutation } = subscriptionData.data.comment
            debug('subscribe:updateQuery', mutation, comment)

            if (mutation !== 'CREATED') {
              return previousResult
            }

            const nodes = previousResult.discussion.comments.nodes

            const existingNode = nodes.find(c => c.id === comment.id)
            if (existingNode) {
              debug('subscribe:updateQuery', 'existing')
              return previousResult
            }

            const firstLocalParent = []
              .concat(comment.parentIds)
              .reverse()
              .find(parentId => {
                return nodes.find(c => c.id === parentId)
              })
            debug('subscribe:onCreate', 'firstLocalParent', firstLocalParent)
            onCreate(comment, firstLocalParent)

            return previousResult
          }
        })
      }
    })
  })
)(Comments)
