import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'
import { css } from 'glamor'
import { A, Checkbox, colors, DEFAULT_PROFILE_PICTURE, fontStyles, mediaQueries, Radio } from '@project-r/styleguide'
import ChevronRightIcon from 'react-icons/lib/md/chevron-right'
import ChevronDownIcon from 'react-icons/lib/md/expand-more'
import { Strong } from './text'
import FavoriteIcon from 'react-icons/lib/md/favorite'
import StarsIcon from 'react-icons/lib/md/stars'
import { Link } from '../../lib/routes'
import voteT from './voteT'

const MISSING_VALUE = <span>…</span>

const styles = {
  row: css({
    position: 'relative',
    width: '100%',
    marginRight: 0
  }),
  statement: css({
    [mediaQueries.onlyS]: {
      marginBottom: 10,
      ...fontStyles.serifTitle22
    },
    ...fontStyles.serifTitle26
  }),
  summaryWrapper: css({
    padding: '13px 20px 15px 20px',
    background: colors.secondaryBg,
    marginTop: 8,
    marginBottom: 8,
    // marginLeft: -26,
    marginRight: 0
  }),
  summary: css({
    width: '100%',
    display: 'flex',
    ...fontStyles.sansSerifRegular16,
    lineHeight: 1.3,
    overflowWrap: 'break-word',
    '& div:nth-child(1)': {
      width: '30%'
    },
    '& div:nth-child(2)': {
      width: '10%'
    },
    '& div:nth-child(3)': {
      width: '40%',
      paddingRight: 10
    },
    '& div:nth-child(4)': {
      width: '15%',
      paddingRight: 5
    },
    '& div:nth-child(5)': {
      width: '5%'
    },
    [mediaQueries.onlyS]: {
      '& div:nth-child(1)': {
        width: '80%'
      },
      '& div:nth-child(2), & div:nth-child(3), & div:nth-child(4)': {
        display: 'none'
      },
      '& div:last-child': {
        width: '20%'
      }
    }
  }),
  summaryMobile: css({
    display: 'none',
    [mediaQueries.onlyS]: {
      marginBottom: 25,
      width: '100%',
      lineHeight: 1.4,
      display: 'block'
    }
  }),
  summaryLinks: css({
    width: '100%',
    minHeight: 20,
    display: 'flex',
    borderTop: '1px solid black',
    '& :nth-child(1)': {
      width: '60%'
    }
  }),
  details: css({
    width: '100%',
    marginTop: 10,
    marginBottom: 5,
    [mediaQueries.lUp]: {
      marginTop: 5
    }
  }),
  portrait: css({
    display: 'block',
    backgroundColor: '#E2E8E6',
    width: 104,
    height: 104,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'grayscale(1)',
    marginRight: 15
  }),
  profile: css({
    marginTop: 5,
    display: 'flex',
    alignItems: 'start',
    [mediaQueries.onlyS]: {
      flexDirection: 'column-reverse'
    },
    '& img': {
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: 'grayscale(1)'
    }
  }),
  profileFooter: css({
    marginTop: 8,
    paddingBottom: 5
  }),
  recommendation: css({
    marginTop: 20
  }),
  wrapper: css({
    [mediaQueries.mUp]: {
      minHeight: 45
    },
    width: '100%',
    display: 'flex',
    padding: 0

  }),
  wrapperSelected: css({
  }),
  icon: css({
    marginTop: 0,
    width: 26,
    marginLeft: -6,
    padding: 0,
    [mediaQueries.onlyS]: {
      marginTop: 0
    }
  }),
  selection: css({
    width: 14,
    paddingTop: 3,
    marginRight: 5
  })
}

class ElectionBallotRow extends Component {
  constructor (props) {
    super(props)
    this.state = {
      expanded: props.expanded || false
    }
    this.toggleExpanded = () => {
      this.setState(({ expanded }) => ({
        expanded: !expanded
      }))
    }
  }

  render () {
    const { candidate, maxVotes, selected, onChange, disabled, interactive, mandatory, vt, showMeta } = this.props
    const { expanded } = this.state
    const SelectionComponent = maxVotes > 1 ? Checkbox : Radio

    const { user: d } = candidate

    const summary =
      <Fragment>
        <div>
          {candidate.yearOfBirth || MISSING_VALUE}
        </div>
        <div>
          {(d.credentials.find(c => c.isListed) || {}).description || MISSING_VALUE}
        </div>
        <div>
          {candidate.city || MISSING_VALUE}
        </div>
      </Fragment>

    return (
      <div {...styles.wrapper} {...(expanded && styles.wrapperSelected)}>
        <div
          onClick={e => { e.preventDefault(); interactive && this.toggleExpanded(d.id) }}
        >
          {
            expanded
              ? <div {...styles.icon}><ChevronDownIcon /></div>
              : <div {...styles.icon}><ChevronRightIcon /></div>
          }
        </div>
        <div
          {...styles.row}
        >
          <div
            {...styles.summary}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onClick={() => onChange(candidate)}
          >
            <div>
              {interactive
                ? <A onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  this.toggleExpanded(d.id)
                }}>{ d.name }</A>
                : d.name
              }

            </div>
            {
              summary
            }
            <div>
              { showMeta &&
                <div style={{ width: 36, height: 18 }}>
                  {candidate.recommendation &&
                  <StarsIcon size={18} />
                  }
                  {mandatory &&
                  <FavoriteIcon size={18} />
                  }
                </div>
              }
            </div>
          </div>
          { expanded &&
          <div
            {...styles.summaryWrapper}
          >
            <div {...styles.summaryMobile}>
              { summary }
            </div>
            <div {...styles.details}>
              <div {...styles.profile}>
                <div>
                  <div style={{ backgroundImage: `url(${d.portrait || DEFAULT_PROFILE_PICTURE})` }} {...styles.portrait} />
                  <div>
                    <div {...styles.profileFooter}>
                      <A href={`/~${d.id}`} target='_blank'>Profil</A>
                    </div>
                    { candidate.comment && candidate.comment.id &&
                      <div>
                        <Link route='voteDiscuss' params={{
                          discussion: candidate.election.slug,
                          focus: candidate.comment.id
                        }} passHref>
                          <A target='_blank'>{ vt('vote/election/discussion') }</A>
                        </Link>
                      </div>
                    }
                  </div>
                </div>
                <div {...styles.statement}>
                  {d.statement || MISSING_VALUE}
                </div>
              </div>
              { candidate.recommendation &&
              <div {...styles.recommendation}>
                <Strong>{ vt('vote/election/recommendation') }</Strong> { candidate.recommendation }
              </div>
              }
            </div>
          </div>
          }
        </div>
        { maxVotes > 0 && onChange &&
        <div {...styles.selection}>
          <SelectionComponent
            black
            disabled={maxVotes > 1 && !selected && disabled}
            checked={selected}
            onChange={() => onChange(candidate)}
          />
        </div>
        }
      </div>
    )
  }
}

ElectionBallotRow.defaultProps = {
  selected: false,
  disabled: false,
  maxVotes: 1,
  expanded: false,
  interactive: true,
  onChange: () => {},
  showMeta: PropTypes.bool
}

ElectionBallotRow.propTypes = {
  selected: PropTypes.bool,
  disabled: PropTypes.bool,
  maxVotes: PropTypes.number,
  expanded: PropTypes.bool,
  interactive: PropTypes.bool,
  onChange: PropTypes.func,
  candidate: PropTypes.object.isRequired,
  showMeta: true
}

export default voteT(ElectionBallotRow)