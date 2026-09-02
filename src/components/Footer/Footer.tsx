import { Button } from 'antd'
import styled from 'styled-components'
import { useTranslation } from '@/context/LanguageContext'

const FooterContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    background-color: #121317;
    color: white;
    width: 100%;
    border-top: 1px solid white;
    border-bottom: 1px solid white;
    height: 50px;
    gap: 1rem;
    flex-shrink: 0;
    > * {
        font-size: 16px;
        line-height: 20px;
    }
`;

interface FooterProps {
    onExport: () => void;
}

export const Footer = ({ onExport }: FooterProps) => {
    const { t } = useTranslation()

    return (
        <FooterContainer>
            <Button type="primary" onClick={onExport}>
                {t('footer.export')}
            </Button>
        </FooterContainer>
    );
}
