import Script from "next/script";

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  locale?: string;
}

export function OrganizationSchema({
  name = "Metacube",
  url = "https://market.metacube.games",
  logo = "https://market.metacube.games/logo.png",
  locale = "en",
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: name,
    url: url,
    logo: logo,
    sameAs: [
      "https://twitter.com/MetacubeGames",
      // Add other social media URLs
    ],
    inLanguage: locale,
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WebSiteSchemaProps {
  name?: string;
  url?: string;
  description?: string;
  locale?: string;
}

export function WebSiteSchema({
  name = "Metacube Marketplace",
  url = "https://market.metacube.games",
  description = "Buy, sell, and trade Metacube NFTs on Starknet",
  locale = "en",
}: WebSiteSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: name,
    url: url,
    description: description,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/collection/allstars?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface NFTCollectionSchemaProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  numberOfItems?: number;
  locale?: string;
}

export function NFTCollectionSchema({
  name,
  description,
  url,
  image,
  numberOfItems,
  locale = "en",
}: NFTCollectionSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: name,
    description: description,
    url: url,
    inLanguage: locale,
    ...(image && { image: image }),
    ...(numberOfItems && {
      numberOfItems: numberOfItems,
      itemListElement: {
        "@type": "ItemList",
        numberOfItems: numberOfItems,
      },
    }),
  };

  return (
    <Script
      id="collection-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
