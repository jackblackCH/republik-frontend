import React, { Component } from 'react'
import { graphql, compose } from 'react-apollo'
import gql from 'graphql-tag'
import { withRouter } from 'next/router'
import { max } from 'd3-array'
import { timeMonth } from 'd3-time'

import { swissTime } from '../lib/utils/format'

import { Link } from '../lib/routes'
import withT from '../lib/withT'
import { CDN_FRONTEND_BASE_URL } from '../lib/constants'

import StatusError from '../components/StatusError'
import withMembership from '../components/Auth/withMembership'
import Frame from '../components/Frame'

import Front from '../components/Front'
import TeaserBlock from '../components/Overview/TeaserBlock'
import { P } from '../components/Overview/Elements'
import text18 from '../components/Overview/2018'
import text19 from '../components/Overview/2019'
import text20 from '../components/Overview/2020'
import { getTeasersFromDocument, getImgSrc } from '../components/Overview/utils'

import { Button, Interaction, Loader, colors } from '@project-r/styleguide'

const texts = {
  2018: text18,
  2019: text19,
  2020: text20
}

const knownYears = {
  2018: { path: '/2018' },
  2019: { path: '/2019' }
}

const getAll = gql`
  query getCompleteFrontOverview($path: String!) {
    front: document(path: $path) {
      id
      content
    }
  }
`
const getKnownYear = gql`
  query getFrontOverviewYear($after: ID, $before: ID) {
    front: document(path: "/") {
      id
      children(after: $after, before: $before) {
        nodes {
          body
        }
      }
    }
  }
`

const formatMonth = swissTime.format('%B')

class FrontOverview extends Component {
  constructor(props, ...args) {
    super(props, ...args)
    this.state = {}
    this.onHighlight = highlight => this.setState({ highlight })
  }
  render() {
    const {
      data,
      isMember,
      me,
      router: { query },
      t
    } = this.props

    if (query.extractId) {
      return (
        <Front
          extractId={query.extractId}
          {...knownYears[+query.year]}
          {...this.props}
        />
      )
    }

    const year = +query.year
    const startDate = new Date(`${year - 1}-12-31T23:00:00.000Z`)
    const endDate = new Date(`${year}-12-31T23:00:00.000Z`)

    const meta = {
      title: t.first([`overview/${year}/meta/title`, 'overview/meta/title'], {
        year
      }),
      description: t.first(
        [`overview/${year}/meta/description`, 'overview/meta/description'],
        { year },
        ''
      ),
      image: [2018, 2019].includes(year)
        ? `${CDN_FRONTEND_BASE_URL}/static/social-media/overview${year}.png`
        : `${CDN_FRONTEND_BASE_URL}/static/social-media/logo.png`
    }

    const teasers = getTeasersFromDocument(data.front)
      .reverse()
      .filter((teaser, i, all) => {
        const publishDates = teaser.nodes
          .map(
            node =>
              node.data.urlMeta &&
              // workaround for «aufdatierte» tutorials and meta texts
              node.data.urlMeta.format !==
                'republik/format-aus-der-redaktion' &&
              new Date(node.data.urlMeta.publishDate)
          )
          .filter(Boolean)

        teaser.publishDate = publishDates.length
          ? max(publishDates)
          : i > 0
          ? all[i - 1].publishDate
          : undefined
        return (
          teaser.publishDate &&
          teaser.publishDate >= startDate &&
          teaser.publishDate < endDate
        )
      })

    if (!data.loading && !data.error && !teasers.length) {
      return (
        <Frame raw>
          <StatusError
            statusCode={404}
            serverContext={this.props.serverContext}
          />
        </Frame>
      )
    }

    const { highlight } = this.state

    const teasersByMonth = teasers.reduce(
      ([all, last], teaser) => {
        const key = formatMonth(teaser.publishDate)
        if (!last || key !== last.key) {
          // ignore unexpected jumps
          // - this happens when a previously published article was placed
          // - or an articles publish date was later updated
          // mostly happens for debates or meta articles
          const prevKey = formatMonth(timeMonth.offset(teaser.publishDate, -1))
          if (!last || prevKey === last.key) {
            const newMonth = { key, values: [teaser] }
            all.push(newMonth)
            return [all, newMonth]
          }
        }
        last.values.push(teaser)
        return [all, last]
      },
      [[]]
    )[0]

    // // WANT ALL TEASERS AS HIGH RES IMAGES?
    //     let curls = ''
    //     teasersByMonth.forEach(({ key: month, values }) => {
    //       const path = (knownYears[year] && knownYears[year].path) || '/'
    //       let m = `\n# ${month}\n`
    //       m += values.map((t, i) => (
    //         `curl -o "pngs/${swissTime.format('%Y-%m-%dT%H')(t.publishDate)}-${t.id}-${i}.png" "${getImgSrc(t, path, null, false).replace('https://cdn.repub.ch/', 'https://assets.republik.space/') + '&zoomFactor=2'}"; sleep 1;`
    //       )).join('\n')
    //
    //       // console.log(m)
    //       curls += m
    //     })
    //     if (typeof window !== 'undefined') { window.curls = curls }
    //     // use copy(curls)

    if (
      !knownYears[year] ||
      (!knownYears[year].after && !knownYears[year].path)
    ) {
      teasersByMonth.reverse()
      teasersByMonth.forEach(m => m.values.reverse())
    }

    return (
      <Frame meta={meta} dark>
        <Interaction.H1
          style={{ color: colors.negative.text, marginBottom: 5 }}
        >
          {t.first([`overview/${year}/title`, 'overview/title'], { year })}
        </Interaction.H1>

        <P style={{ marginBottom: 10 }}>
          {isMember
            ? t.first([`overview/${year}/lead`, 'overview/lead'], { year }, '')
            : t.elements(`overview/lead/${me ? 'pledge' : 'signIn'}`)}
        </P>
        {!isMember && (
          <Link key='pledgeBefore' route='pledge' passHref>
            <Button white>{t('overview/lead/pledgeButton')}</Button>
          </Link>
        )}

        <Loader
          loading={data.loading}
          error={data.error}
          style={{ minHeight: `calc(90vh)` }}
          render={() => {
            return teasersByMonth.map(({ key: month, values }, i) => {
              const Text = texts[year] && texts[year][month]
              return (
                <div
                  style={{ marginTop: 50 }}
                  key={month}
                  onClick={() => {
                    // a no-op for mobile safari
                    // - causes mouse enter and leave to be triggered
                  }}
                >
                  <Interaction.H2
                    style={{
                      color: colors.negative.text,
                      marginBottom: 5,
                      marginTop: 0
                    }}
                  >
                    {month}
                  </Interaction.H2>
                  <P style={{ marginBottom: 20 }}>
                    {Text && (
                      <Text
                        highlight={highlight}
                        onHighlight={this.onHighlight}
                      />
                    )}
                  </P>
                  <TeaserBlock
                    {...knownYears[+query.year]}
                    teasers={values}
                    highlight={highlight}
                    onHighlight={this.onHighlight}
                    lazy={i !== 0}
                  />
                </div>
              )
            })
          }}
        />

        {!isMember && (
          <Link key='pledgeAfter' route='pledge' passHref>
            <Button white style={{ marginTop: 100 }}>
              {t('overview/after/pledgeButton')}
            </Button>
          </Link>
        )}
      </Frame>
    )
  }
}

export default compose(
  withRouter,
  graphql(getAll, {
    skip: props => {
      const knownYear = knownYears[+props.router.query.year]
      return knownYear && !knownYear.path && !props.router.query.extractId
    },
    options: props => ({
      variables: knownYears[+props.router.query.year] || {
        path: '/'
      }
    })
  }),
  graphql(getKnownYear, {
    skip: props => {
      const knownYear = knownYears[+props.router.query.year]
      return (!knownYear || knownYear.path) && !props.router.query.extractId
    },
    options: props => ({
      variables: knownYears[+props.router.query.year]
    })
  }),
  withMembership,
  withT
)(FrontOverview)
