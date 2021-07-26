import { DefaultSeoProps } from "next-seo";

const description = 
      "A technology demonstration website to showcase a proof of concept contact tracing application using the AWS Cloud Development Kit."
const title = "Contact Tracing"


const seo: DefaultSeoProps = {
  title,
  description,
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://ct.vercel.app/",
    site_name: "Contact Trace",
    title,
    description,
    images: [
      {
        url: `https://${
          process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL
        }/alina-grubnyak-VyqJqTYvoqA-unsplash.jpg`,
        alt: "alina-grubnyak-VyqJqTYvoqA-unsplash",
      },
    ],
  },
  twitter: {
    handle: "@kochie",
    site: "@kochie",
    cardType: "summary_large_image",
  },
};

export default seo;
