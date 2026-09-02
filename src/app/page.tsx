import { DiscordAuth } from '@/components/Discord/DiscordAuth'
import { Home } from '@/components/Home'
import { Providers } from '@/components/Providers'

export default function Index() {
    const discordAuth = <DiscordAuth />

    return (
        <Providers>
            <Home discordAuth={discordAuth} />
        </Providers>
    )
}
