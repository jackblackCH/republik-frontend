import React from 'react'
import { graphql, compose } from 'react-apollo'
import gql from 'graphql-tag'

import { Center, TeaserFeed, Interaction, Loader } from '@project-r/styleguide'
import Link from '../Link/Href'

import withT from '../../lib/withT'

import ActionBar from '../ActionBar/Feed'
import Box from '../Frame/Box'
import { onDocumentFragment as bookmarkOnDocumentFragment } from '../Bookmarks/fragments'
import { WithoutMembership } from '../Auth/withMembership'

const getFeedDocuments = gql`
  query getFeedDocuments($formats: [String!]) {
    documents(formats: $formats, first: 100) {
      totalCount
      nodes {
        id
        ...BookmarkOnDocument
        meta {
          credits
          title
          description
          publishDate
          path
          format {
            id
            meta {
              kind
              color
              title
            }
          }
          estimatedReadingMinutes
          estimatedConsumptionMinutes
          indicateChart
          indicateGallery
          indicateVideo
          audioSource {
            mp3
          }
        }
      }
    }
  }
  ${bookmarkOnDocumentFragment}
`

const Feed = ({ t, data: { loading, error, documents } }) => (
  <Loader
    loading={loading}
    error={error}
    render={() => {
      return (
        <Center>
          <Interaction.H2>
            {t.pluralize('section/feed/title', { count: documents.totalCount })}
          </Interaction.H2>
          <br />
          <br />
          <WithoutMembership
            render={() => (
              <Box style={{ padding: '15px 20px' }}>
                <Interaction.P>{t('section/feed/payNote')}</Interaction.P>
              </Box>
            )}
          />
          {documents &&
            documents.nodes.map(doc => (
              <TeaserFeed
                {...doc.meta}
                title={doc.meta.shortTitle || doc.meta.title}
                description={!doc.meta.shortTitle && doc.meta.description}
                Link={Link}
                key={doc.meta.path}
                bar={
                  <ActionBar
                    documentId={doc.id}
                    userBookmark={doc.userBookmark}
                    {...doc.meta}
                  />
                }
              />
            ))}
        </Center>
      )
    }}
  />
)

export default compose(
  withT,
  graphql(getFeedDocuments)
)(Feed)
