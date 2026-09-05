import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MarketingHome } from './marketing/pages/Home.tsx'
import { MarketingPricing } from './marketing/pages/Pricing.tsx'
import { MarketingAbout } from './marketing/pages/About.tsx'
import { MarketingContact } from './marketing/pages/Contact.tsx'
import { MarketingPrivacy } from './marketing/pages/Privacy.tsx'
import { MarketingTerms } from './marketing/pages/Terms.tsx'
import { MarketingDisclaimer } from './marketing/pages/Disclaimer.tsx'
import { MarketingNotFound } from './marketing/pages/NotFound.tsx'
import { routes } from './marketing/config.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path={routes.home}       element={<MarketingHome />} />
        <Route path={routes.pricing}    element={<MarketingPricing />} />
        <Route path={routes.about}      element={<MarketingAbout />} />
        <Route path={routes.contact}    element={<MarketingContact />} />
        <Route path={routes.privacy}    element={<MarketingPrivacy />} />
        <Route path={routes.terms}      element={<MarketingTerms />} />
        <Route path={routes.disclaimer} element={<MarketingDisclaimer />} />
        <Route path="/app/*"            element={<App />} />
        <Route path="*"                 element={<MarketingNotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
