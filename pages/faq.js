import React from 'react'

import Frame from '../components/Frame'

import FaqList, { H2 } from '../components/Faq/List'
import FaqForm from '../components/Faq/Form'

import withT from '../lib/withT'

import { Interaction, RawHtml } from '@project-r/styleguide'

import { PUBLIC_BASE_URL, CDN_FRONTEND_BASE_URL } from '../lib/constants'

export default withT(({ t }) => (
  <Frame
    meta={{
      pageTitle: t('faq/pageTitle'),
      title: t('faq/title'),
      description: t('faq/metaDescription'),
      url: `${PUBLIC_BASE_URL}/faq`,
      image: `${CDN_FRONTEND_BASE_URL}/static/social-media/faq.png`
    }}
  >
    <H2>{t('faq/before/title')}</H2>
    <Interaction.H3>{t('faq/before/support/title')}</Interaction.H3>
    <RawHtml
      type={Interaction.P}
      dangerouslySetInnerHTML={{
        __html: t('faq/before/support/text')
      }}
    />
    <br />
    <FaqList />
    <FaqForm />
  </Frame>
))
