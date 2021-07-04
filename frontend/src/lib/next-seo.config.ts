import { DefaultSeoProps } from "next-seo";

const seo: DefaultSeoProps = {
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://ct.vercel.app/",
    site_name: "Contact Trace",
    title: "Open Graph Title",
    description: "Open Graph Description",
    images: [
      {
        url: "",
        width: 0,
        height: 0,
        alt: "",
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
