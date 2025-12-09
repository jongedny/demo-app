/**
 * ONIX XML Parser Service
 * Supports ONIX 3.0 with both reference tags and short tags
 */

import { parseStringPromise } from 'xml2js';
import { readFile } from 'fs/promises';

// ONIX 3.0 Short Tag to Reference Tag mapping
const ONIX_TAG_MAP: Record<string, string> = {
    // Product identifiers
    'a001': 'RecordReference',
    'a002': 'NotificationType',
    'a197': 'RecordSourceName',
    'b221': 'ProductIDType',
    'b244': 'IDValue',

    // Title information
    'b202': 'TitleType',
    'b203': 'TitleWithoutPrefix',
    'b030': 'TitlePrefix',
    'b031': 'TitleWithoutPrefix',
    'x409': 'TitleElementLevel',

    // Contributors
    'b034': 'SequenceNumber',
    'b035': 'ContributorRole',
    'b036': 'PersonName',
    'b037': 'PersonNameInverted',
    'b039': 'NamesBeforeKey',
    'b040': 'KeyNames',

    // Product details
    'b012': 'ProductForm',
    'b333': 'ProductFormDetail',
    'x314': 'ProductComposition',

    // Description
    'x426': 'TextType',
    'x427': 'ContentAudience',
    'd104': 'Text',

    // Publishing
    'b079': 'ImprintName',
    'b081': 'PublisherName',
    'b083': 'CountryOfPublication',
    'b394': 'PublishingStatus',
    'x448': 'PublishingDateRole',
    'b306': 'Date',

    // Pricing
    'x462': 'PriceType',
    'j151': 'PriceAmount',
    'j152': 'CurrencyCode',

    // Subject/Genre
    'b067': 'SubjectSchemeIdentifier',
    'b068': 'SubjectSchemeVersion',
    'b069': 'SubjectCode',
    'b070': 'SubjectHeadingText',

    // Language
    'b252': 'LanguageCode',
    'b253': 'LanguageRole',

    // Extent
    'b218': 'ExtentType',
    'b219': 'ExtentValue',
    'b220': 'ExtentUnit',
};

export interface ParsedBook {
    recordReference?: string;
    isbn13?: string;
    isbn10?: string;
    title?: string;
    subtitle?: string;
    author?: string;
    contributors?: string[];
    description?: string;
    publisher?: string;
    imprint?: string;
    publicationDate?: string;
    price?: string;
    currency?: string;
    genre?: string;
    subjects?: string[];
    keywords?: string[];
    language?: string;
    pageCount?: number;
    productForm?: string;
    coverImageUrl?: string;
}

/**
 * Normalize XML structure - convert short tags to reference tags
 */
function normalizeXmlObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(normalizeXmlObject);
    }

    const normalized: any = {};

    for (const [key, value] of Object.entries(obj)) {
        // Convert short tag to reference tag if mapping exists
        const lowerKey = key.toLowerCase();
        const normalizedKey = (lowerKey in ONIX_TAG_MAP) ? ONIX_TAG_MAP[lowerKey]! : key;
        normalized[normalizedKey] = normalizeXmlObject(value);
    }

    return normalized;
}

/**
 * Extract text from XML element (handles both string and object formats)
 */
function extractText(element: any): string | undefined {
    if (!element) return undefined;
    if (typeof element === 'string') return element.trim();
    if (Array.isArray(element)) return extractText(element[0]);
    if (element._) return element._.trim();
    if (typeof element === 'object') {
        const keys = Object.keys(element);
        if (keys.length === 0) return undefined;
        return extractText(element[keys[0]]);
    }
    return undefined;
}

/**
 * Extract ISBN from product identifiers
 */
function extractISBN(productIdentifiers: any[]): { isbn13?: string; isbn10?: string } {
    const result: { isbn13?: string; isbn10?: string } = {};

    if (!Array.isArray(productIdentifiers)) {
        productIdentifiers = [productIdentifiers];
    }

    for (const identifier of productIdentifiers) {
        const idType = extractText(identifier.ProductIDType || identifier.b221);
        const idValue = extractText(identifier.IDValue || identifier.b244);

        if (!idValue) continue;

        // ProductIDType codes: 02 = ISBN-10, 03 = ISBN-13, 15 = ISBN-13
        if (idType === '03' || idType === '15') {
            result.isbn13 = idValue;
        } else if (idType === '02') {
            result.isbn10 = idValue;
        }
    }

    return result;
}

/**
 * Extract title from title detail
 */
function extractTitle(titleDetail: any): { title?: string; subtitle?: string } {
    if (!titleDetail) return {};

    const titleElement = Array.isArray(titleDetail) ? titleDetail[0] : titleDetail;
    const titleElements = titleElement.TitleElement || titleElement.titleelement;

    if (!titleElements) return {};

    const mainTitle = Array.isArray(titleElements) ? titleElements[0] : titleElements;

    const prefix = extractText(mainTitle.TitlePrefix || mainTitle.b030);
    const titleWithoutPrefix = extractText(mainTitle.TitleWithoutPrefix || mainTitle.b203 || mainTitle.b031);
    const subtitle = extractText(mainTitle.Subtitle || mainTitle.b029);

    let title = titleWithoutPrefix || '';
    if (prefix) {
        title = `${prefix} ${title}`;
    }

    return { title: title || undefined, subtitle };
}

/**
 * Extract contributors (authors, illustrators, etc.)
 */
function extractContributors(contributors: any): { author?: string; contributors?: string[] } {
    if (!contributors) return {};

    const contributorList = Array.isArray(contributors) ? contributors : [contributors];
    const allContributors: string[] = [];
    let primaryAuthor: string | undefined;

    for (const contributor of contributorList) {
        const role = extractText(contributor.ContributorRole || contributor.b035);
        const name = extractText(contributor.PersonName || contributor.b036);

        if (name) {
            allContributors.push(name);

            // A01 = Author
            if (role === 'A01' && !primaryAuthor) {
                primaryAuthor = name;
            }
        }
    }

    return {
        author: primaryAuthor,
        contributors: allContributors.length > 0 ? allContributors : undefined,
    };
}

/**
 * Extract description from text content
 */
function extractDescription(collateralDetail: any): string | undefined {
    if (!collateralDetail) return undefined;

    const textContent = collateralDetail.TextContent || collateralDetail.textcontent;
    if (!textContent) return undefined;

    const textContentList = Array.isArray(textContent) ? textContent : [textContent];

    // Look for TextType 03 (description) or 02 (short description)
    for (const content of textContentList) {
        const textType = extractText(content.TextType || content.x426);

        if (textType === '03' || textType === '02') {
            let text = extractText(content.Text || content.d104);
            if (text) {
                // Remove HTML tags and clean up
                text = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                return text;
            }
        }
    }

    return undefined;
}

/**
 * Extract cover image URL
 */
function extractCoverImage(collateralDetail: any): string | undefined {
    if (!collateralDetail) return undefined;

    const supportingResource = collateralDetail.SupportingResource || collateralDetail.supportingresource;
    if (!supportingResource) return undefined;

    const resources = Array.isArray(supportingResource) ? supportingResource : [supportingResource];

    for (const resource of resources) {
        const resourceType = extractText(resource.ResourceContentType || resource.x436);

        // ResourceContentType 01 = Front cover
        if (resourceType === '01') {
            const resourceVersion = resource.ResourceVersion || resource.resourceversion;
            if (resourceVersion) {
                const version = Array.isArray(resourceVersion) ? resourceVersion[0] : resourceVersion;
                const link = extractText(version.ResourceLink || version.x435);
                if (link) return link;
            }
        }
    }

    return undefined;
}

/**
 * Extract publishing information
 */
function extractPublishingInfo(publishingDetail: any): {
    publisher?: string;
    imprint?: string;
    publicationDate?: string;
} {
    if (!publishingDetail) return {};

    const publisher = extractText(
        publishingDetail.Publisher?.PublisherName ||
        publishingDetail.publisher?.b081
    );

    const imprint = extractText(
        publishingDetail.Imprint?.ImprintName ||
        publishingDetail.imprint?.b079
    );

    const publishingDate = publishingDetail.PublishingDate || publishingDetail.publishingdate;
    let publicationDate: string | undefined;

    if (publishingDate) {
        const dateElement = Array.isArray(publishingDate) ? publishingDate[0] : publishingDate;
        const dateRole = extractText(dateElement.PublishingDateRole || dateElement.x448);

        // PublishingDateRole 01 = Publication date
        if (dateRole === '01') {
            publicationDate = extractText(dateElement.Date || dateElement.b306);
        }
    }

    return { publisher, imprint, publicationDate };
}

/**
 * Extract price information
 */
function extractPrice(productSupply: any): { price?: string; currency?: string } {
    if (!productSupply) return {};

    const supplyDetail = productSupply.SupplyDetail || productSupply.supplydetail;
    if (!supplyDetail) return {};

    const detail = Array.isArray(supplyDetail) ? supplyDetail[0] : supplyDetail;
    const priceElement = detail.Price || detail.price;

    if (!priceElement) return {};

    const price = Array.isArray(priceElement) ? priceElement[0] : priceElement;

    return {
        price: extractText(price.PriceAmount || price.j151),
        currency: extractText(price.CurrencyCode || price.j152),
    };
}

/**
 * Extract subjects and genre
 */
function extractSubjects(descriptiveDetail: any): {
    genre?: string;
    subjects?: string[];
    keywords?: string[];
} {
    if (!descriptiveDetail) return {};

    const subjectElements = descriptiveDetail.Subject || descriptiveDetail.subject;
    if (!subjectElements) return {};

    const subjects = Array.isArray(subjectElements) ? subjectElements : [subjectElements];
    const subjectTexts: string[] = [];
    const keywordTexts: string[] = [];
    let mainGenre: string | undefined;

    for (const subject of subjects) {
        const schemeId = extractText(subject.SubjectSchemeIdentifier || subject.b067);
        const subjectCode = extractText(subject.SubjectCode || subject.b069);
        const subjectText = extractText(subject.SubjectHeadingText || subject.b070);

        // Scheme 12 = BIC, 10 = BISAC, 20 = Keywords
        if (schemeId === '20' && subjectText) {
            // Keywords
            keywordTexts.push(...subjectText.split(';').map(k => k.trim()));
        } else if (subjectText) {
            subjectTexts.push(subjectText);

            // Use first BIC or BISAC subject as main genre
            if (!mainGenre && (schemeId === '12' || schemeId === '10')) {
                mainGenre = subjectText;
            }
        }
    }

    return {
        genre: mainGenre,
        subjects: subjectTexts.length > 0 ? subjectTexts : undefined,
        keywords: keywordTexts.length > 0 ? keywordTexts : undefined,
    };
}

/**
 * Extract page count
 */
function extractPageCount(descriptiveDetail: any): number | undefined {
    if (!descriptiveDetail) return undefined;

    const extent = descriptiveDetail.Extent || descriptiveDetail.extent;
    if (!extent) return undefined;

    const extentElement = Array.isArray(extent) ? extent[0] : extent;
    const extentType = extractText(extentElement.ExtentType || extentElement.b218);

    // ExtentType 00 = Main content page count
    if (extentType === '00' || extentType === '10') {
        const value = extractText(extentElement.ExtentValue || extentElement.b219);
        return value ? parseInt(value, 10) : undefined;
    }

    return undefined;
}

/**
 * Parse a single product from ONIX XML
 */
function parseProduct(product: any): ParsedBook {
    // Normalize the product structure
    const normalized = normalizeXmlObject(product);

    // Extract record reference
    const recordReference = extractText(normalized.RecordReference);

    // Extract ISBNs
    const { isbn13, isbn10 } = extractISBN(
        normalized.ProductIdentifier || normalized.productidentifier || []
    );

    // Extract title
    const { title, subtitle } = extractTitle(
        normalized.DescriptiveDetail?.TitleDetail ||
        normalized.descriptivedetail?.titledetail
    );

    // Extract contributors
    const { author, contributors } = extractContributors(
        normalized.DescriptiveDetail?.Contributor ||
        normalized.descriptivedetail?.contributor
    );

    // Extract description
    const description = extractDescription(
        normalized.CollateralDetail || normalized.collateraldetail
    );

    // Extract cover image
    const coverImageUrl = extractCoverImage(
        normalized.CollateralDetail || normalized.collateraldetail
    );

    // Extract publishing info
    const { publisher, imprint, publicationDate } = extractPublishingInfo(
        normalized.PublishingDetail || normalized.publishingdetail
    );

    // Extract price
    const { price, currency } = extractPrice(
        normalized.ProductSupply || normalized.productsupply
    );

    // Extract subjects
    const { genre, subjects, keywords } = extractSubjects(
        normalized.DescriptiveDetail || normalized.descriptivedetail
    );

    // Extract page count
    const pageCount = extractPageCount(
        normalized.DescriptiveDetail || normalized.descriptivedetail
    );

    // Extract product form
    const productForm = extractText(
        normalized.DescriptiveDetail?.ProductForm ||
        normalized.descriptivedetail?.b012
    );

    return {
        recordReference,
        isbn13,
        isbn10,
        title,
        subtitle,
        author,
        contributors,
        description,
        publisher,
        imprint,
        publicationDate,
        price: price && currency ? `${price} ${currency}` : price,
        currency,
        genre,
        subjects,
        keywords,
        pageCount,
        productForm,
        coverImageUrl,
    };
}

/**
 * Parse ONIX XML file and extract book data
 */
export async function parseOnixFile(filepath: string): Promise<{
    books: ParsedBook[];
    source?: string;
    error?: string;
}> {
    try {
        const xmlContent = await readFile(filepath, 'utf-8');
        const parsed = await parseStringPromise(xmlContent, {
            trim: true,
            explicitArray: false,
            mergeAttrs: true,
        });

        // Handle both ONIXMessage and ONIXmessage (case variations)
        const root = parsed.ONIXMessage || parsed.ONIXmessage || parsed.onixmessage;

        if (!root) {
            return { books: [], error: 'Invalid ONIX format: root element not found' };
        }

        // Extract source from header
        const header = root.Header || root.header;
        const source = extractText(
            header?.Sender?.SenderName ||
            header?.sender?.x298
        );

        // Extract products
        const products = root.Product || root.product;

        if (!products) {
            return { books: [], source, error: 'No products found in ONIX file' };
        }

        const productList = Array.isArray(products) ? products : [products];
        const books = productList.map(parseProduct);

        return { books, source };
    } catch (error) {
        return {
            books: [],
            error: error instanceof Error ? error.message : 'Unknown parsing error',
        };
    }
}

/**
 * Detect ONIX format type from filename or content
 */
export function detectOnixSource(filename: string): string {
    if (filename.toLowerCase().includes('aponix')) {
        return 'APONIX';
    } else if (filename.toLowerCase().includes('penguin')) {
        return 'Penguin Random House';
    }
    return 'Unknown';
}
