require("dotenv").config();
const { GoogleAdsApi } = require("google-ads-api");
const { getOAuthClient, getRefreshToken } = require("./oauth-client");

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_MCC_ID,
} = process.env;

function assertEnv() {
  const missing = [];
  if (!GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!GOOGLE_ADS_DEVELOPER_TOKEN) missing.push("GOOGLE_ADS_DEVELOPER_TOKEN");
  if (!GOOGLE_ADS_MCC_ID) missing.push("GOOGLE_ADS_MCC_ID");
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(", ")}`);
  }
}

function getDateRange(days = 30) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

const microsToUnits = (m) => (Number(m) || 0) / 1_000_000;
const safeRoas = (value, cost) => (cost > 0 ? (value / cost) * 100 : 0);

function formatCampaigns(rows) {
  return rows.map((r) => {
    const cost = microsToUnits(r.metrics?.cost_micros);
    const value = Number(r.metrics?.conversions_value) || 0;
    return {
      id: r.campaign?.id ? String(r.campaign.id) : null,
      name: r.campaign?.name,
      status: r.campaign?.status,
      channelType: r.campaign?.advertising_channel_type,
      biddingStrategyType: r.campaign?.bidding_strategy_type,
      impressions: Number(r.metrics?.impressions) || 0,
      clicks: Number(r.metrics?.clicks) || 0,
      cost,
      conversions: Number(r.metrics?.conversions) || 0,
      conversionsValue: value,
      ctr: Number(r.metrics?.ctr) || 0,
      avgCpc: microsToUnits(r.metrics?.average_cpc),
      searchImpressionShare: r.metrics?.search_impression_share ?? null,
      roas: safeRoas(value, cost),
    };
  });
}

function formatSearchTerms(rows) {
  return rows.map((r) => ({
    searchTerm: r.search_term_view?.search_term,
    status: r.search_term_view?.status,
    campaign: r.campaign?.name,
    impressions: Number(r.metrics?.impressions) || 0,
    clicks: Number(r.metrics?.clicks) || 0,
    cost: microsToUnits(r.metrics?.cost_micros),
    conversions: Number(r.metrics?.conversions) || 0,
    ctr: Number(r.metrics?.ctr) || 0,
  }));
}

function formatAdGroups(rows) {
  return rows.map((r) => ({
    name: r.ad_group?.name,
    campaign: r.campaign?.name,
    impressions: Number(r.metrics?.impressions) || 0,
    clicks: Number(r.metrics?.clicks) || 0,
    cost: microsToUnits(r.metrics?.cost_micros),
    conversions: Number(r.metrics?.conversions) || 0,
    ctr: Number(r.metrics?.ctr) || 0,
    avgCpc: microsToUnits(r.metrics?.average_cpc),
  }));
}

function formatAssetGroups(rows) {
  return rows.map((r) => ({
    id: r.asset_group?.id ? String(r.asset_group.id) : null,
    name: r.asset_group?.name || null,
    status: r.asset_group?.status || null,
    finalUrls: r.asset_group?.final_urls || [],
    impressions: Number(r.metrics?.impressions) || 0,
    clicks: Number(r.metrics?.clicks) || 0,
    cost: microsToUnits(r.metrics?.cost_micros),
    conversions: Number(r.metrics?.conversions) || 0,
    conversionsValue: Number(r.metrics?.conversions_value) || 0,
    ctr: Number(r.metrics?.ctr) || 0,
  }));
}

function formatAssets(rows) {
  return rows
    .map((r) => {
      const asset = r.asset;
      const fieldType = r.asset_group_asset?.field_type || null;
      const assetGroupId = r.asset_group?.id ? String(r.asset_group.id) : null;
      const assetGroupName = r.asset_group?.name || null;

      let text = null;
      let imageUrl = null;
      let youtubeId = null;
      let callToAction = null;

      if (asset?.text_asset?.text) text = asset.text_asset.text;
      if (asset?.image_asset?.full_size?.url) imageUrl = asset.image_asset.full_size.url;
      if (asset?.youtube_video_asset?.youtube_video_id) youtubeId = asset.youtube_video_asset.youtube_video_id;
      if (asset?.call_to_action_asset?.call_to_action) callToAction = asset.call_to_action_asset.call_to_action;

      return {
        assetId: asset?.id ? String(asset.id) : null,
        fieldType,
        assetGroupId,
        assetGroupName,
        text,
        imageUrl,
        youtubeId,
        callToAction,
      };
    })
    .filter((a) => a.text || a.imageUrl || a.youtubeId || a.callToAction);
}

function formatConversions(rows) {
  return rows.map((r) => {
    const conversions = Number(r.metrics?.conversions) || 0;
    const value = Number(r.metrics?.conversions_value) || 0;
    return {
      name: r.segments?.conversion_action_name,
      category: r.segments?.conversion_action_category,
      conversions,
      conversionsValue: value,
      valuePerConversion: conversions > 0 ? value / conversions : 0,
      allConversions: Number(r.metrics?.all_conversions) || 0,
    };
  });
}

// Cuentas inactivas — excluidas del análisis
const EXCLUDED_CUSTOMER_IDS = new Set([
  "2090233509", // Rolling Green Inc
  "2689550398", // Squeegee Clean 360
  "7644774978", // Superior Equipment 2
]);

async function fetchAllAccountsData() {
  assertEnv();

  // Dispara refresh proactivo y persiste el token actualizado al disco
  await getOAuthClient();
  const refreshToken = getRefreshToken();

  const client = new GoogleAdsApi({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
  });

  const mcc = client.Customer({
    customer_id: GOOGLE_ADS_MCC_ID,
    login_customer_id: GOOGLE_ADS_MCC_ID,
    refresh_token: refreshToken,
  });

  console.log(`🔍 Listando cuentas hijo del MCC ${GOOGLE_ADS_MCC_ID}...`);

  const childRows = await mcc.query(`
    SELECT
      customer_client.client_customer,
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.currency_code,
      customer_client.level,
      customer_client.status
    FROM customer_client
    WHERE customer_client.level = 1
      AND customer_client.status = 'ENABLED'
  `);

  console.log(`📂 Encontradas ${childRows.length} cuentas hijo habilitadas.`);

  const { startDate, endDate } = getDateRange();
  const dateFilter = `segments.date BETWEEN '${startDate}' AND '${endDate}'`;

  const campaignsQuery = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.search_impression_share
    FROM campaign
    WHERE ${dateFilter}
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `;

  const searchTermsQuery = `
    SELECT
      search_term_view.search_term,
      search_term_view.status,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr
    FROM search_term_view
    WHERE ${dateFilter}
      AND metrics.impressions > 10
    ORDER BY metrics.cost_micros DESC
    LIMIT 30
  `;

  const adGroupsQuery = `
    SELECT
      ad_group.name,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM ad_group
    WHERE ${dateFilter}
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `;

  const conversionsQuery = `
    SELECT
      segments.conversion_action_name,
      segments.conversion_action_category,
      metrics.conversions,
      metrics.conversions_value,
      metrics.all_conversions
    FROM customer
    WHERE ${dateFilter}
    ORDER BY metrics.conversions DESC
    LIMIT 15
  `;

  const results = [];

  for (const row of childRows) {
    const childId = String(row.customer_client?.id);
    const accountName = row.customer_client?.descriptive_name || childId;
    const currency = row.customer_client?.currency_code || null;

    if (EXCLUDED_CUSTOMER_IDS.has(childId)) {
      console.log(`⏭  Saltando cuenta inactiva: ${accountName} (${childId})`);
      continue;
    }

    try {
      const customer = client.Customer({
        customer_id: childId,
        login_customer_id: GOOGLE_ADS_MCC_ID,
        refresh_token: refreshToken,
      });

      const [campaignsRaw, searchTermsRaw, adGroupsRaw, conversionsRaw] = await Promise.all([
        customer.query(campaignsQuery),
        customer.query(searchTermsQuery),
        customer.query(adGroupsQuery),
        customer.query(conversionsQuery),
      ]);

      results.push({
        account: accountName,
        accountId: childId,
        currency,
        campaigns: formatCampaigns(campaignsRaw),
        searchTerms: formatSearchTerms(searchTermsRaw),
        adGroups: formatAdGroups(adGroupsRaw),
        conversions: formatConversions(conversionsRaw),
      });

      console.log(`✅ ${accountName} (${childId}) — ok`);
    } catch (err) {
      const detail =
        err?.message ||
        err?.errors?.map((e) => `${JSON.stringify(e.error_code)}: ${e.message}`).join(" | ") ||
        "(sin detalle)";
      const reqId = err?.request_id ? ` [request_id=${err.request_id}]` : "";
      console.error(`⚠️  ${accountName} (${childId}) — falló: ${detail}${reqId}`);
    }
  }

  return results;
}

function formatAds(rows) {
  return rows
    .map((r) => {
      const cost = microsToUnits(r.metrics?.cost_micros);
      const rsa = r.ad_group_ad?.ad?.responsive_search_ad;
      return {
        adGroupAdResourceName: r.ad_group_ad?.resource_name || null,
        adGroup: r.ad_group?.name || null,
        adId: r.ad_group_ad?.ad?.id ? String(r.ad_group_ad.ad.id) : null,
        adType: r.ad_group_ad?.ad?.type || null,
        status: r.ad_group_ad?.status || null,
        finalUrls: r.ad_group_ad?.ad?.final_urls || [],
        headlines:
          rsa?.headlines?.map((h) => ({
            text: h.text,
            pinned: h.pinned_field || null,
          })) || [],
        descriptions:
          rsa?.descriptions?.map((d) => ({
            text: d.text,
            pinned: d.pinned_field || null,
          })) || [],
        path1: rsa?.path1 || null,
        path2: rsa?.path2 || null,
        impressions: Number(r.metrics?.impressions) || 0,
        clicks: Number(r.metrics?.clicks) || 0,
        cost,
        conversions: Number(r.metrics?.conversions) || 0,
        ctr: Number(r.metrics?.ctr) || 0,
      };
    })
    .filter((a) => a.headlines.length > 0 || a.impressions > 0);
}

function formatKeywords(rows) {
  return rows.map((r) => {
    const cost = microsToUnits(r.metrics?.cost_micros);
    const value = Number(r.metrics?.conversions_value) || 0;
    return {
      text: r.ad_group_criterion?.keyword?.text || null,
      matchType: r.ad_group_criterion?.keyword?.match_type || null,
      adGroup: r.ad_group?.name || null,
      status: r.ad_group_criterion?.status || null,
      impressions: Number(r.metrics?.impressions) || 0,
      clicks: Number(r.metrics?.clicks) || 0,
      cost,
      conversions: Number(r.metrics?.conversions) || 0,
      conversionsValue: value,
      ctr: Number(r.metrics?.ctr) || 0,
      avgCpc: microsToUnits(r.metrics?.average_cpc),
      qualityScore: r.ad_group_criterion?.quality_info?.quality_score ?? null,
      roas: safeRoas(value, cost),
    };
  });
}

function formatGeo(rows, nameById) {
  return rows.map((r) => {
    const cost = microsToUnits(r.metrics?.cost_micros);
    const value = Number(r.metrics?.conversions_value) || 0;
    const idRaw = r.geographic_view?.country_criterion_id;
    const id = idRaw != null ? String(idRaw) : null;
    return {
      criterionId: id,
      location: id && nameById[id] ? nameById[id] : id || "(desconocido)",
      locationType: r.geographic_view?.location_type || null,
      impressions: Number(r.metrics?.impressions) || 0,
      clicks: Number(r.metrics?.clicks) || 0,
      cost,
      conversions: Number(r.metrics?.conversions) || 0,
      conversionsValue: value,
      ctr: Number(r.metrics?.ctr) || 0,
      roas: safeRoas(value, cost),
    };
  });
}

function describeAdsError(err) {
  if (!err) return "(sin error)";
  if (err.message) return err.message;
  if (Array.isArray(err.errors)) {
    return err.errors
      .map((e) => {
        const code =
          (e.error_code && JSON.stringify(e.error_code).replace(/[{}"]/g, "")) || "unknown";
        return `${code}: ${e.message || "(sin mensaje)"}`;
      })
      .join(" | ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function resolveGeoNames(customer, criterionIds) {
  const unique = [...new Set(criterionIds.filter(Boolean))];
  if (unique.length === 0) return {};
  const idList = unique.join(",");
  try {
    const rows = await customer.query(`
      SELECT
        geo_target_constant.id,
        geo_target_constant.name,
        geo_target_constant.canonical_name,
        geo_target_constant.target_type
      FROM geo_target_constant
      WHERE geo_target_constant.id IN (${idList})
    `);
    const map = {};
    for (const row of rows) {
      const id = String(row.geo_target_constant?.id);
      map[id] = row.geo_target_constant?.canonical_name || row.geo_target_constant?.name || id;
    }
    return map;
  } catch (err) {
    // Si falla la resolución, devolvemos {} y se usa el id crudo
    console.warn(`⚠️  No se pudo resolver geo_target_constant: ${err?.message || err}`);
    return {};
  }
}

async function fetchCampaignDetail(customerId, campaignId) {
  assertEnv();
  await getOAuthClient();
  const refreshToken = getRefreshToken();

  const client = new GoogleAdsApi({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
  });

  const customer = client.Customer({
    customer_id: String(customerId),
    login_customer_id: GOOGLE_ADS_MCC_ID,
    refresh_token: refreshToken,
  });

  const { startDate, endDate } = getDateRange();
  const dateFilter = `segments.date BETWEEN '${startDate}' AND '${endDate}'`;
  const campaignFilter = `campaign.id = ${campaignId}`;

  const campaignMetaQuery = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      campaign_budget.delivery_method,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.search_impression_share
    FROM campaign
    WHERE ${campaignFilter} AND ${dateFilter}
  `;

  const adGroupsQuery = `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc
    FROM ad_group
    WHERE ${campaignFilter} AND ${dateFilter}
    ORDER BY metrics.cost_micros DESC
    LIMIT 30
  `;

  const adsQuery = `
    SELECT
      ad_group_ad.resource_name,
      ad_group_ad.status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad.responsive_search_ad.path1,
      ad_group_ad.ad.responsive_search_ad.path2,
      ad_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr
    FROM ad_group_ad
    WHERE ${campaignFilter} AND ${dateFilter}
    ORDER BY metrics.cost_micros DESC
    LIMIT 30
  `;

  const keywordsQuery = `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.quality_info.quality_score,
      ad_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc
    FROM keyword_view
    WHERE ${campaignFilter} AND ${dateFilter}
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;

  const geoQuery = `
    SELECT
      geographic_view.country_criterion_id,
      geographic_view.location_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr
    FROM geographic_view
    WHERE ${campaignFilter} AND ${dateFilter}
    ORDER BY metrics.cost_micros DESC
    LIMIT 30
  `;

  const searchTermsQuery = `
    SELECT
      search_term_view.search_term,
      search_term_view.status,
      ad_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr
    FROM search_term_view
    WHERE ${campaignFilter} AND ${dateFilter} AND metrics.impressions > 5
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;

  const assetGroupsQuery = `
    SELECT
      asset_group.id,
      asset_group.name,
      asset_group.status,
      asset_group.final_urls,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr
    FROM asset_group
    WHERE ${campaignFilter} AND ${dateFilter}
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `;

  const assetsQuery = `
    SELECT
      asset_group_asset.field_type,
      asset_group.id,
      asset_group.name,
      asset.id,
      asset.text_asset.text,
      asset.image_asset.full_size.url,
      asset.youtube_video_asset.youtube_video_id,
      asset.call_to_action_asset.call_to_action
    FROM asset_group_asset
    WHERE ${campaignFilter}
    LIMIT 200
  `;

  const [metaRows, adGroupsRaw, adsRaw, keywordsRaw, geoRaw, searchTermsRaw, assetGroupsRaw, assetsRaw] = await Promise.all([
    customer.query(campaignMetaQuery),
    customer.query(adGroupsQuery).catch((err) => {
      console.warn(`⚠️  adGroups query falló: ${describeAdsError(err)}`);
      return [];
    }),
    customer.query(adsQuery).catch((err) => {
      console.warn(`⚠️  ads query falló: ${describeAdsError(err)}`);
      return [];
    }),
    customer.query(keywordsQuery).catch((err) => {
      console.warn(`⚠️  keywords query falló: ${describeAdsError(err)}`);
      return [];
    }),
    customer.query(geoQuery).catch((err) => {
      console.warn(`⚠️  geo query falló: ${describeAdsError(err)}`);
      return [];
    }),
    customer.query(searchTermsQuery).catch((err) => {
      console.warn(`⚠️  searchTerms query falló: ${describeAdsError(err)}`);
      return [];
    }),
    customer.query(assetGroupsQuery).catch((err) => {
      console.warn(`⚠️  assetGroups query falló: ${describeAdsError(err)}`);
      return [];
    }),
    customer.query(assetsQuery).catch((err) => {
      console.warn(`⚠️  assets query falló: ${describeAdsError(err)}`);
      return [];
    }),
  ]);

  const metaRow = metaRows[0] || null;
  const campaignMeta = metaRow
    ? {
        id: String(metaRow.campaign?.id || campaignId),
        name: metaRow.campaign?.name || null,
        status: metaRow.campaign?.status || null,
        channelType: metaRow.campaign?.advertising_channel_type || null,
        biddingStrategyType: metaRow.campaign?.bidding_strategy_type || null,
        dailyBudget: microsToUnits(metaRow.campaign_budget?.amount_micros),
        budgetDeliveryMethod: metaRow.campaign_budget?.delivery_method || null,
        impressions: Number(metaRow.metrics?.impressions) || 0,
        clicks: Number(metaRow.metrics?.clicks) || 0,
        cost: microsToUnits(metaRow.metrics?.cost_micros),
        conversions: Number(metaRow.metrics?.conversions) || 0,
        conversionsValue: Number(metaRow.metrics?.conversions_value) || 0,
        ctr: Number(metaRow.metrics?.ctr) || 0,
        avgCpc: microsToUnits(metaRow.metrics?.average_cpc),
        searchImpressionShare: metaRow.metrics?.search_impression_share ?? null,
        roas: safeRoas(
          Number(metaRow.metrics?.conversions_value) || 0,
          microsToUnits(metaRow.metrics?.cost_micros)
        ),
      }
    : null;

  const geoIds = geoRaw.map((r) => r.geographic_view?.country_criterion_id).filter(Boolean);
  const geoNameById = await resolveGeoNames(customer, geoIds);

  return {
    campaign: campaignMeta,
    adGroups: formatAdGroups(adGroupsRaw),
    ads: formatAds(adsRaw),
    keywords: formatKeywords(keywordsRaw),
    geo: formatGeo(geoRaw, geoNameById),
    searchTerms: formatSearchTerms(searchTermsRaw),
    assetGroups: formatAssetGroups(assetGroupsRaw),
    assets: formatAssets(assetsRaw),
  };
}

// Fetch liviano de search terms para un customer ID — usado por keyword-opportunities
async function fetchAccountSearchTerms(customerId) {
  assertEnv();
  await getOAuthClient();
  const refreshToken = getRefreshToken();

  const client = new GoogleAdsApi({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
  });

  const customer = client.Customer({
    customer_id: String(customerId),
    login_customer_id: GOOGLE_ADS_MCC_ID,
    refresh_token: refreshToken,
  });

  // Intentamos 90 días para tener más cobertura en cuentas de bajo volumen
  const { startDate, endDate } = getDateRange(90);
  console.log(`[ads-fetch] fetchAccountSearchTerms(${customerId}) → ${startDate} a ${endDate}`);

  const rows = await customer.query(`
    SELECT
      search_term_view.search_term,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM search_term_view
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.impressions >= 1
    ORDER BY metrics.impressions DESC
    LIMIT 200
  `);

  console.log(`[ads-fetch] fetchAccountSearchTerms(${customerId}) → ${rows.length} filas devueltas`);

  return rows.map((r) => ({
    searchTerm: r.search_term_view?.search_term || "",
    impressions: Number(r.metrics?.impressions) || 0,
    clicks: Number(r.metrics?.clicks) || 0,
    cost: microsToUnits(r.metrics?.cost_micros),
    conversions: Number(r.metrics?.conversions) || 0,
  })).filter((r) => r.searchTerm.length > 2);
}

module.exports = { fetchAllAccountsData, fetchCampaignDetail, fetchAccountSearchTerms };
