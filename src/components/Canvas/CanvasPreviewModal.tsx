"use client"

import { useEffect } from 'react'
import styled from 'styled-components'
import { useTranslation } from '@/context/LanguageContext'

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.82);
    padding: 48px 24px 24px;
`

const ImageFrame = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    max-height: 100%;
`

const PreviewImage = styled.img`
    display: block;
    max-width: 100%;
    max-height: calc(100vh - 72px);
    width: auto;
    height: auto;
    object-fit: contain;
    background: #22242b;
    border: 1px solid #555;
`

const CloseButton = styled.button`
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 1001;
    width: 40px;
    height: 40px;
    border: 1px solid #888;
    border-radius: 6px;
    background: #1a1c24;
    color: white;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;

    &:hover {
        border-color: #aaf0d1;
        color: #aaf0d1;
    }
`

interface CanvasPreviewModalProps {
    imageSrc: string
    onClose: () => void
}

/** キャンバス画像を画面いっぱいに表示するプレビュー */
export const CanvasPreviewModal = ({ imageSrc, onClose }: CanvasPreviewModalProps) => {
    const { t } = useTranslation()

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    return (
        <Overlay
            role="dialog"
            aria-modal="true"
            aria-label={t('canvas.preview')}
            onClick={onClose}
        >
            <CloseButton
                type="button"
                aria-label={t('canvas.previewClose')}
                onClick={(event) => {
                    event.stopPropagation()
                    onClose()
                }}
            >
                ✕
            </CloseButton>
            <ImageFrame onClick={(event) => event.stopPropagation()}>
                <PreviewImage src={imageSrc} alt={t('canvas.preview')} />
            </ImageFrame>
        </Overlay>
    )
}
