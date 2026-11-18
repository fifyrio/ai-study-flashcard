"""Assign each 全媒体运营师 question to a syllabus chapter by keyword.

The media bank is shuffled, so chapters cannot come from question numbers. Each
chapter owns a weighted keyword list; the highest-scoring chapter wins and
questions that hit nothing fall back to ``basic``. It is a study convenience, not
an official classification, so a few questions will land in a neighbouring chapter.
"""
from __future__ import annotations

# chapter -> {keyword: weight}
KEYWORDS: dict[str, dict[str, int]] = {
    "placement": {
        "投放": 3, "广告创意": 3, "预算": 2, "目标受众": 2, "着陆页": 3, "创意素材": 3,
        "素材库": 3, "投放方案": 3, "定向": 2, "投放时机": 3, "受众": 1, "广告主": 2,
        "账户": 2, "自动化投放": 3, "SMART": 3, "KPI": 2, "投放平台": 3, "目标设定": 2,
        "用户画像": 1, "广告文案": 2, "广告审核": 1, "素材": 1,
    },
    "optimize": {
        "流量优化": 4, "出价": 3, "转化": 1, "营销工具": 3, "SEO": 3, "搜索引擎": 2,
        "关键词": 1, "流量来源": 3, "流量瓶颈": 3, "分发": 2, "工具": 1, "SEM": 3,
        "A/B": 1, "用户体验": 1, "内容创作": 1, "社交媒体管理": 2, "CRM": 3, "DSP": 3,
        "程序化": 3, "自动化营销": 3, "短视频营销": 2, "直播营销": 2, "社群营销": 2,
        "KOL": 3, "邮件营销": 3, "内容营销": 2, "优化方案": 2,
    },
    "analysis": {
        "统计报表": 4, "报表": 2, "CPC": 4, "CPA": 4, "CAC": 4, "ROAS": 4, "点击率": 2,
        "转化率": 2, "漏斗": 4, "留存": 3, "对比分析": 3, "细分分析": 4, "聚类": 3,
        "相关性": 3, "趋势分析": 3, "热力图": 4, "数据分析": 2, "数据源": 2, "可视化": 2,
        "指标": 2, "KPIs": 3, "描述性统计": 3, "分析方法": 2, "分析报告": 1, "交易数据": 3,
        "客户价值": 3, "客户生命周期": 3, "CLV": 3, "ROI": 2, "渠道效果": 2,
    },
    "review": {
        "数据质量": 4, "完整性": 3, "精确性": 3, "一致性": 2, "时效性": 3, "可用性": 2,
        "缺失值": 4, "异常值": 4, "账号核心数据": 5, "播放量": 4, "完播率": 4, "点赞": 4,
        "评论数": 3, "转发": 3, "关注人数": 4, "互动率": 4, "复盘": 3, "粉丝": 3,
        "数据清洗": 3, "数据验证": 3, "账号": 2, "互动": 1, "选题": 2, "内容结构": 2,
    },
    "industry": {
        "行业报告": 4, "行业分析": 4, "渠道库": 4, "学术数据库": 4, "行业领袖": 4,
        "行业痛点": 4, "行业发展": 3, "行业概况": 4, "商业数据库": 3, "资源下载": 3,
        "素材搜集": 4, "信息渠道": 3, "搜索引擎高级": 4, "行业资讯": 3, "产业链": 3,
        "发展机遇": 3, "市场定位": 2, "行业": 1,
    },
    "platform": {
        "传播平台": 2, "平台分析": 4, "视频类平台": 4, "音频类平台": 4, "新闻资讯": 3,
        "图片类": 3, "综合类平台": 4, "内容社区": 4, "文字类": 3, "SWOT": 4, "竞品分析": 2,
        "平台特征": 4, "平台用户": 3, "平台报告": 3, "平台": 1, "资源库": 2, "市场概况": 2,
        "竞争环境": 3, "内容生态": 3, "用户行为": 1,
    },
    "basic": {
        "职业道德": 5, "诚信": 3, "版权": 3, "知识产权": 3, "隐私": 2, "传播学": 4, "传播的": 2,
        "数字营销": 3, "广告法": 5, "网络安全法": 5, "电子商务": 3, "电商": 3, "著作权": 4,
        "消费者权益": 5, "产品质量法": 5, "食品安全": 4, "直播服务": 3, "职业守则": 4,
        "职业概述": 4, "全媒体的概念": 4, "全媒体平台": 2, "营销的概念": 4, "广告的概念": 4,
        "法律": 2, "法规": 2, "职业分类": 4, "专业精神": 4, "新媒体传播": 3, "全媒体运营师应": 2,
    },
}

_ORDER = ["placement", "optimize", "analysis", "review", "platform", "industry", "basic"]


def scores(text: str) -> dict[str, int]:
    return {ch: sum(w for kw, w in kws.items() if kw in text) for ch, kws in KEYWORDS.items()}


def media_chapter(text: str) -> str:
    """Return the chapter key whose keywords match ``text`` best (ties follow ``_ORDER``)."""
    sc = scores(text)
    best = max(_ORDER, key=lambda k: (sc[k], -_ORDER.index(k)))
    return best if sc[best] > 0 else "basic"
