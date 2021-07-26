import { DefaultSeoProps } from "next-seo";

const seo: DefaultSeoProps = {
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://ct.vercel.app/",
    site_name: "Contact Trace",
    title: "Contact Tracing",
    description:
      "A technology demonstration website to showcase a proof of concept contact tracing application using the AWS Cloud Development Kit.",
    images: [
      {
        url: "/alina-grubnyak-VyqJqTYvoqA-unsplash.jpg",
        width: 640,
        height: 426,
        alt: "alina-grubnyak-VyqJqTYvoqA-unsplash",
      },
    ],
  },
  twitter: {
    handle: "@kochie",
    //     site: "@site",
    cardType: "summary_large_image",
  },
};

export default seo;
