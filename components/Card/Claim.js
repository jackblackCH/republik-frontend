import React, { useState, useEffect } from 'react'
import { withRouter } from 'next/router'
import { compose, graphql } from 'react-apollo'
import gql from 'graphql-tag'
import { css } from 'glamor'
import { format } from 'url'

import isEmail from 'validator/lib/isEmail'

import { Interaction, InlineSpinner, A, Button, Field, RawHtml } from '@project-r/styleguide'

import withMe from '../../lib/apollo/withMe'
import withT from '../../lib/withT'

import Loader from '../Loader'
import StatusError from '../StatusError'
import ErrorMessage from '../ErrorMessage'

import Portrait from './Form/Portrait'
import Details from './Form/Details'
import Statement from './Form/Statement'
import { styles as formStyles } from './Form/styles'

import { withSignIn } from '../Auth/SignIn'
import { withSignOut } from '../Auth/SignOut'
import SwitchBoard from '../Auth/SwitchBoard'
import Consents, { getConsentsError } from '../Pledge/Consents'

const { H1, H2, P } = Interaction

const styles = {
  signedIn: css({
    marginTop: 40
  }),
  switchBoard: css({
    marginTop: 40
  })
}

const REQUIRED_CONSENTS = ['PRIVACY', 'TOS']

const maybeCard = (data, apply) => {
  return data.cards &&
    data.cards.nodes.length > 0 &&
    data.cards.nodes[0] &&
    apply(data.cards.nodes[0])
}

const Page = (props) => {
  const { serverContext, router: { query: { token } }, data, me, t } = props

  const [consents, setConsents] = useState([])
  const [email, setEmail] = useState({ value: (me && me.email) || '' })
  const [portrait, setPortrait] = useState({ values: {} })
  const [statement, setStatement] = useState({ value: maybeCard(data, card => card.payload.statement) || '' })
  const [showErrors, setShowErrors] = useState(false)
  const [serverError, setServerError] = useState(false)
  const [autoClaimCard, setAutoClaimCard] = useState(false)
  const [autoSignIn, setAutoSignIn] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tokenType, setTokenType] = useState('EMAIL_CODE')
  const [phrase, setPhrase] = useState('')

  useEffect(() => {
    if (autoClaimCard) {
      setShowErrors(true)

      if (errorMessages.length === 0) {
        props.claimCard({
          id: card.id,
          accessToken: token,
          portrait: portrait.values.portrait,
          statement: statement.value,
          email: email.value
        })
          .then(() => {
            window.location = format({
              pathname: `/wahltindaer/setup`
            })
          })
          .catch(catchError)
      }
      setAutoClaimCard(false)
    }
  }, [autoClaimCard])

  useEffect(() => {
    if (autoSignIn) {
      setShowErrors(true)

      if (errorMessages.length === 0) {
        props.signIn(
          email.value,
          'card',
          consents,
          tokenType
        )
          .then(({ data: { signIn } }) => {
            setTokenType(signIn.tokenType)
            setPhrase(signIn.phrase)

            setSigningIn(true)
          })
          .catch(catchError)
      }
    }

    setAutoSignIn(false)
  }, [autoSignIn])

  if (data.loading || data.error) {
    return <Loader loading={data.loading} error={data.error} />
  }

  if (!data.cards || data.cards.nodes.length === 0) {
    return (
      <>
        <H2 {...formStyles.heading}>{t('components/Card/Claim/404/title')}</H2>
        <P {...formStyles.paragraph}>{t('components/Card/Claim/404/lead')}</P>
        <P {...formStyles.paragraph}>
          <RawHtml
            dangerouslySetInnerHTML={{
              __html: t('components/Card/Claim/404/help')
            }}
          />
        </P>
      </>
    )
  }

  const [ card ] = data.cards.nodes

  const handlePortrait = ({ values, errors }) => {
    setPortrait({
      values,
      errors
    })
  }

  const handleStatement = (value, shouldValidate) => {
    setStatement({
      ...statement,
      value,
      error: (
        (value.trim().length <= 0 && 'Statement fehlt')
      ),
      dirty: shouldValidate
    })
  }

  const handleEmail = (value, shouldValidate) => {
    setEmail({
      ...email,
      value,
      error: (
        (value.trim().length <= 0 && t('Trial/Form/email/error/empty')) ||
        (!isEmail(value) && t('Trial/Form/email/error/invalid'))
      ),
      dirty: shouldValidate
    })
  }

  const claimCard = e => {
    e && e.preventDefault && e.preventDefault()

    handleEmail(email.value, true)
    handleStatement(statement.value, true)
    handlePortrait(portrait)

    setLoading(true)

    if (!me) {
      setAutoSignIn(true)
      return
    }

    setAutoClaimCard(true)
  }

  const onSuccessSwitchBoard = () => {
    setSigningIn(false)
    setAutoClaimCard(true)
  }

  const catchError = error => {
    setServerError(error)
    setSigningIn(false)
    setLoading(false)
  }

  if (!card) {
    return (
      <StatusError
        statusCode={404}
        serverContext={serverContext} />
    )
  }

  const errorMessages = [
    portrait.errors && portrait.errors.portrait,
    portrait.errors && portrait.errors.portraitPreview,
    statement.error,
    email.error
  ].concat(getConsentsError(t, REQUIRED_CONSENTS, consents))
    .filter(Boolean)

  return (
    <>
      <H1 {...formStyles.heading}>{t('components/Card/Claim/headline')}</H1>
      <P>
        <RawHtml
          dangerouslySetInnerHTML={{
            __html: t('components/Card/Claim/lead')
          }}
        />
      </P>

      <div {...formStyles.portraitAndDetails}>
        <div {...formStyles.portrait}>
          <Portrait
            user={card.user}
            values={portrait.values}
            errors={portrait.errors}
            onChange={handlePortrait} />
        </div>
        <div style={{ marginLeft: 40 }}>
          <Details card={card} user={card.user} />
        </div>
      </div>

      <div {...formStyles.section}>
        <P>{t('components/Card/Claim/statement/question')}</P>
        <Statement
          label={t('components/Card/Claim/statement/label')}
          statement={statement}
          handleStatement={handleStatement} />
      </div>

      {!me && (
        <div {...formStyles.section}>
          <Field
            label={t('Trial/Form/email/label')}
            value={email.value}
            error={email.dirty && email.error}
            dirty={email.dirty}
            onChange={(_, value, shouldValidate) => handleEmail(value, shouldValidate)} />
        </div>
      )}

      {me && (
        <div {...formStyles.section}>
          <P {...formStyles.paragraph}>
            {t('components/Card/Claim/me/account')}<strong> {me.email}</strong>
          </P>
          <P>
            {t('components/Card/Claim/me/assignNote')}
            <br />
            <A
              href='#abmelden'
              onClick={e => {
                e.preventDefault()
                props.signOut()
              }}>
              {t('components/Card/Claim/me/signOut')}
            </A>
          </P>
        </div>
      )}

      <div {...formStyles.section}>
        <Consents
          required={REQUIRED_CONSENTS}
          accepted={consents}
          disabled={signingIn}
          onChange={setConsents} />
      </div>

      {showErrors && errorMessages.length > 0 && (
        <div {...formStyles.errorMessages}>
          {t('Trial/Form/error/title')}<br />
          <ul>
            {errorMessages.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {!signingIn && (
        <div {...formStyles.button}>
          {loading
            ? <InlineSpinner />
            : <Button
              primary
              type='submit'
              block
              onClick={claimCard}
              disabled={showErrors && errorMessages.length > 0}>
              {t('components/Card/Claim/submit')}
            </Button>
          }
        </div>
      )}

      {signingIn && (
        <div {...styles.switchBoard}>
          <SwitchBoard
            email={email.value}
            tokenType={tokenType}
            phrase={phrase}
            alternativeFirstFactors={[]}
            onCancel={() => {}}
            onTokenTypeChange={() => {}}
            onSuccess={onSuccessSwitchBoard} />
        </div>
      )}

      {serverError && <ErrorMessage error={serverError} />}
    </>
  )
}

const CARDS_VIA_ACCESS_TOKEN = gql`
  query claimCardForm($accessToken: ID!) {
    cards(accessToken: $accessToken first: 1) {
      nodes {
        id
        payload
        group {
          id
          name
        }
        user {
          id
          name
          isUserOfCurrentSession
          portrait(properties:{width:600 height:800 bw:false})
        }
      }
    }
  }
`

const withCardsViaAccessToken = graphql(
  CARDS_VIA_ACCESS_TOKEN,
  {
    options: ({ router }) => ({
      variables: {
        accessToken: router.query.token
      }
    })
  }
)

const CLAIM_CARD = gql`
  mutation claimCard(
    $id: ID!
    $accessToken: ID!
    $portrait: String
    $statement: String!
  ) {
    claimCard(
      id: $id
      accessToken: $accessToken
      portrait: $portrait
      statement: $statement
    ) {
      id
    }
  }
`

const withClaimCard = graphql(
  CLAIM_CARD,
  {
    props: ({ mutate }) => ({
      claimCard: ({ id, accessToken, portrait, statement, email }) => mutate({
        variables: { id, accessToken, portrait, statement, email }
      })
    })
  }
)

export default compose(
  withSignOut,
  withSignIn,
  withMe,
  withRouter,
  withT,
  withCardsViaAccessToken,
  withClaimCard
)(Page)
