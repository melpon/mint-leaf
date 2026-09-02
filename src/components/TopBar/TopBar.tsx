"use client"

import styled from 'styled-components'
import { default as NextImage } from 'next/image'
import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { Locale, useLanguage, useTranslation } from '@/context/LanguageContext'

const TopBarContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: #121317;
    width: 100%;
    border-bottom: 1px solid white;
    height: 56px;
    padding: 0 1rem;
    gap: 8px;
    flex-shrink: 0;
`

const Brand = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
`

const BrandText = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
`

const TitleText = styled.h1`
    margin: 0;
    color: white;
    font-size: 1.5em;
    line-height: 1;
    letter-spacing: 0.7px;
`

const SubTitleText = styled.span`
    color: #c8cbce;
    font-size: 12px;
    letter-spacing: 0.1px;
`

const RightNav = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1.5rem;
    margin-left: auto;
`

const LanguageDropdownTrigger = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    background: none;
    color: #c8cbce;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    transition: color 0.15s ease;

    .current-locale {
        color: white;
        font-weight: 500;
    }

    .chevron {
        font-size: 10px;
        opacity: 0.7;
        transform: translateY(1px);
    }

    &:hover,
    &[aria-expanded="true"] {
        color: #aaf0d1;

        .current-locale {
            color: #aaf0d1;
        }
    }
`

const localeLabel = (locale: Locale): string => (locale === 'en' ? 'EN' : 'JP')

interface TopBarProps {
    onExport: () => void
}

export const TopBar = ({ onExport }: TopBarProps) => {
    const { t } = useTranslation()
    const { locale, setLocale } = useLanguage()

    const languageMenuItems: MenuProps['items'] = [
        { key: 'en', label: 'EN' },
        { key: 'ja', label: 'JP' },
    ]

    const onLanguageMenuClick: MenuProps['onClick'] = ({ key }) => {
        setLocale(key as Locale)
    }

    return (
        <TopBarContainer>
            <Brand>
                <NextImage
                    src="/leaf-icon.svg"
                    alt={t('title.logoAlt')}
                    width={32}
                    height={32}
                    priority={true}
                />
                <BrandText>
                    <TitleText>Mint Leaf</TitleText>
                    <SubTitleText>{t('title.subtitle')}</SubTitleText>
                </BrandText>
            </Brand>
            <RightNav>
                <Dropdown
                    menu={{
                        items: languageMenuItems,
                        onClick: onLanguageMenuClick,
                        selectedKeys: [locale],
                    }}
                    trigger={['click']}
                    overlayClassName="language-dropdown-overlay"
                >
                    <LanguageDropdownTrigger type="button">
                        <span>{t('title.language')}</span>
                        <span className="current-locale">{localeLabel(locale)}</span>
                        <span className="chevron">▼</span>
                    </LanguageDropdownTrigger>
                </Dropdown>
                <Button type="primary" onClick={onExport}>
                    {t('footer.export')}
                </Button>
            </RightNav>
        </TopBarContainer>
    )
}
