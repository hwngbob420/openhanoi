// Ngữ pháp tracery tiếng Việt Hà Nội đời thường + luật CHỌN CÂU theo ngữ cảnh (giờ, thứ, thời tiết, khu vực, loại quán, dáng NPC).
// Dùng: expand('vendor', { slot: 'pho_sang' }) -> chuỗi. Không dùng modifier tiếng Anh của tracery (hỏng chữ Việt).
// Các hàm pick*() là hàm thuần (chỉ nhận ctx), để chạy thử sinh mẫu ngoài trình duyệt.
// ctx = { hour, wd (0=CN…6=T7), rain, weather ('sunny'|'cloudy'|'rain'|'storm'), sunset, ws (đang phố đi bộ), zone ('lake'|'alley'|'rail'|'pho'|'street'), nearLake }
import tracery from './vendor/tracery.mjs'

export const TYPES = {
  vendor: { color: '#ffb62e', label: 'Rao hàng' },
  chat: { color: '#35c4b0', label: 'Đối đáp' },
  think: { color: '#a98bff', label: 'Suy nghĩ' },
  wow: { color: '#ff7ab8', label: 'Trầm trồ' },
  traffic: { color: '#ff6f61', label: 'Giao thông' },
  sound: { color: '#62d894', label: 'Âm thanh' },
}

const G = {
  // (1) tiếng rao — theo LOẠI QUÁN (pho / banhmi / tc = quán trà chanh phố tàu / cstore = cửa hàng tiện lợi) và khung giờ
  //     sang 5–10:30 · trua 10:30–16:30 · toi 16:30–22 · khuya 22–5. Quán ghim: phở đêm, phở gánh, bánh mì khuya.
  vendor: {
    origin: ['#sang#'],
    sang: ['#pho_sang#', '#banhmi_sang#'],
    trua: ['#pho_trua#', '#banhmi_trua#', '#tc_trua#'],
    toi: ['#pho_toi#', '#banhmi_toi#', '#tc_toi#'],
    khuya: ['#pho_khuya#', '#banhmi_khuya#'],
    pho_sang: ['Phở bò tái chín nóng hổi đây, #moi#!', '#goi# ơi, phở nóng đây, có cả quẩy giòn!', 'Bát phở sáng cho ấm bụng, #moi#!', 'Phở bò đây, nước dùng ninh từ đêm qua!', 'Phở tái lăn thơm nức, #moi# vào ăn sáng!'],
    pho_trua: ['Phở trưa đây, #moi#!', 'Trưa rồi, làm bát phở cho chắc dạ, #moi#!', 'Phở bò nóng, có trà đá mát, #moi#!', 'Còn bàn trống đây, #moi# vào ăn phở!'],
    pho_toi: ['Phở tối nóng hổi đây, #moi#!', 'Trời se lạnh, làm bát phở cho ấm, #moi#!', '#goi# ơi, phở bò tái chín đây!', 'Phở nóng, quẩy giòn, #moi# vào ngồi!'],
    pho_khuya: ['Phở đêm đây, ăn cho ấm bụng rồi về ngủ!', 'Khuya rồi vẫn còn phở nóng, #moi#!', 'Phở đêm nóng hổi, #moi# vào ngồi!', 'Đói đêm à? Bát phở nóng ngay đây!'],
    pho_ganh: ['Phở gánh đây, ngồi ghế đẩu ăn mới đã!', 'Phở gánh nóng hổi, #moi# ăn sáng!', 'Gánh phở vừa dọn, nước dùng còn sôi sùng sục!'],
    banhmi_sang: ['Bánh mì pate nóng giòn đây, #moi#!', 'Bánh mì trứng, bánh mì pate đây, #moi#!', 'Bánh mì mới ra lò, giòn rụm, #moi#!', 'Bánh mì nóng đây, ăn sáng cho nhanh nào!'],
    banhmi_trua: ['Bánh mì pate kẹp dưa, ăn trưa cho nhanh, #moi#!', 'Bánh mì nóng giòn, có nước mía mát, #moi#!', 'Bánh mì trứng ốp đây, #moi#!'],
    banhmi_toi: ['Bánh mì nóng giòn đây, #moi#!', 'Bánh mì pate, bánh mì trứng, #moi# ăn tối!', 'Bánh mì nướng lại cho giòn, #moi#!'],
    banhmi_khuya: ['Bánh mì khuya đây, nướng lại cho giòn!', 'Đói đêm à? Bánh mì nóng đây, #moi#!', 'Bánh mì khuya, pate nhà làm, #moi#!'],
    cstore: ['Xin chào, mời anh chị vào xem hàng ạ!', 'Có bánh mì nóng, đồ ăn sẵn, mời vào ạ!', 'Cửa hàng mở cả đêm, mời anh chị ghé ạ!'],
    tc_sang: ['Cà phê nâu, cà phê trứng đây, #moi#!', 'Ngồi uống cà phê chờ tàu qua nào, #moi#!', 'Sáng ra làm cốc cà phê cho tỉnh, #moi#!'],
    tc_trua: ['Trà chanh mát lạnh đây, #moi#!', 'Trà chanh, trà quất giải nhiệt đây!', 'Ngồi trà chanh xem tàu qua nào, #moi#!'],
    tc_toi: ['Trà chanh, hướng dương đây, #moi#!', 'Ngồi trà chanh chém gió nào, #moi#!', 'Còn bàn sát đường ray, #moi# ngồi xem tàu!'],
    tc_khuya: ['Quán sắp dọn rồi, cốc trà chanh cuối nhé!', 'Trà chanh đêm, còn vài bàn, #moi#!'],
    moi: ['mời bác', 'mời cô chú', 'mời anh chị', 'mời các bạn', 'mời cả nhà'],
    goi: ['Các bác', 'Anh chị', 'Cô chú', 'Các bạn'],
  },
  // (2) đối đáp: câu mở đứng một mình (dùng khi gọi say(..., 'chat')). Cặp hỏi–đáp nằm trong PAIRS bên dưới.
  chat: {
    origin: ['Chào bác, dạo này khỏe không?', 'Lâu quá mới gặp đấy!', 'Đi đâu mà vội thế?', 'Ăn cơm chưa đấy?', 'Hôm nào rảnh đi cà phê nhé!'],
  },
  // (3) suy nghĩ — mỗi ký hiệu là một ngữ cảnh; pickThink() chọn ký hiệu nào được dùng.
  think: {
    origin: ['#chung#'],
    mua: ['Mưa rồi, quần áo ngoài ban công chưa rút!', 'Trời ơi, mưa! Áo mưa để đâu rồi nhỉ?', 'Mưa thế này, ăn bát bún ốc nóng là hết ý.', 'Ướt hết rồi, phải chạy vào hiên trú thôi.', 'Mưa lâm thâm cả buổi, đường trơn quá.'],
    sangHo: ['Sáng sớm, sương còn giăng trên mặt hồ.', 'Dậy sớm tập thể dục quanh hồ mới đã.', 'Đi bộ ba vòng hồ, hôm nay chăm thật!'],
    sang: ['Mùi cà phê sáng thơm quá.', 'Sáng nay ăn bánh cuốn hay phở nhỉ?', 'Đường bắt đầu đông rồi, đi làm thôi.', 'Sáng nay se lạnh, phải mặc thêm áo khoác.'],
    trua: ['Nắng hanh thế này, thèm cốc trà đá.', 'Trưa rồi, tìm chỗ ngồi nghỉ thôi.', 'Trời hanh khô, môi nẻ hết cả.', 'Nắng nhẹ thế này, ngồi vỉa hè uống trà đá là nhất.'],
    truaMay: ['Trời âm u, chắc chiều nay mưa.', 'Trưa rồi, tìm chỗ ngồi nghỉ thôi.', 'Hôm nay trời dịu, đi bộ không mỏi chân.', 'Trời xám xịt, phơi đồ chắc không khô.'],
    hoanghonHo: ['Hoàng hôn Hồ Gươm đẹp quá…', 'Nắng chiều trên mặt hồ, đẹp như tranh.', 'Ráng chiều đỏ cả Tháp Rùa.', 'Mặt hồ lấp lánh nắng chiều, chụp ảnh thôi.'],
    chieu: ['Mới chiều mà trời đã sẩm tối, mùa đông có khác.', 'Sắp tan tầm, đường lại tắc cho xem.', 'Chiều rồi, phải đi đón con thôi.', 'Ngày mùa đông ngắn thật, chưa gì đã tối.'],
    toi: ['Phố lên đèn rồi, đẹp thật.', 'Tối se lạnh, đi ăn bát phở cho ấm.', 'Tối nay ăn bún chả hay bún đậu nhỉ?', 'Mùi ngô nướng thơm cả góc phố.'],
    toiPdb: ['Phố đi bộ đông vui quá!', 'Tối nay phố đi bộ có nhóm nhảy kìa.', 'Cuối tuần, đi dạo phố đi bộ thôi.'],
    khuya: ['Khuya rồi, về ngủ thôi.', 'Đêm Hà Nội vắng hẳn, chỉ còn tiếng xe rác.', 'Đói quá, đi tìm hàng phở đêm.', 'Phố vắng tanh, nghe rõ cả tiếng lá rơi.'],
    ngo: ['Ngõ này lắt léo thật.', 'Ngõ sâu thế này, shipper tìm sao nổi.', 'Dây điện chằng chịt, nhìn mà hoa cả mắt.', 'Ngõ nhỏ mà nhà nào cũng dắt xe máy vào tận nhà.'],
    tau: ['Sắp có tàu chưa nhỉ?', 'Ở phố này, nghe còi tàu thành quen.', 'Tàu qua sát nhà, cốc nước cũng rung.'],
    thu2: ['Thứ Hai đầu tuần, uể oải quá.'],
    thu6: ['Thứ Sáu rồi, tối nay đi phố đi bộ thôi!'],
    cuoituan: ['Cuối tuần, phải đi chơi cho đã.', 'Cuối tuần mà vẫn phải đi làm…'],
    chung: ['Hôm nay ăn gì nhỉ?', 'Lương tháng này chưa thấm vào đâu.', 'Hà Nội cuối thu, đi đâu cũng thơm mùi hoa sữa.', 'Tháng này lại sắp đến kỳ đóng tiền trọ.'],
  },
  // (4) trầm trồ khi nhân vật chính đổi đồ / nhuộm tóc. `item` do code thêm (ví dụ "tóc đỏ cam").
  wow: {
    origin: ['#khen#'],
    khen: ['Ôi, #item# đẹp quá!', 'Chà, #item# hợp ghê!', 'Nhìn #item# kìa, sành điệu thế!', 'Bạn ơi, #item# xinh xỉu luôn!', 'Ồ, #item# nổi bật cả phố!'],
    toc: ['Ôi, tóc mới nhìn ngầu quá!', 'Nhuộm tóc đẹp thế, ở tiệm nào vậy?', 'Màu tóc này nổi cả con phố!', 'Tóc mới hợp mặt ghê!'],
    tocDen: ['Để lại tóc đen trông hiền hẳn!', 'Tóc đen tự nhiên vẫn đẹp nhất.', 'Ơ, nhuộm lại đen rồi à? Hợp đấy!'],
    trang: ['Bộ đồ mới nhìn lịch sự quá!', 'Mặc đồ này đi chụp ảnh là đẹp!', 'Diện thế này chắc đi hẹn hò!', 'Đồ mới à? Nhìn sành điệu đấy!'],
  },
  // (5) giao thông
  traffic: {
    origin: ['#nhuong#'],
    nhuong: ['Ối, xích lô! Nhường bác đi trước nào.', 'Nghe chuông xích lô rồi, tránh sang bên!', 'Kính coong! Tránh đường cho bác xích lô nhé.', 'Từ từ thôi, nhường đường nào.'],
    giat: ['Á! Xe gì đâu mà lao ra thế!', 'Giật cả mình! Đi đứng cẩn thận chứ!', 'Trời ơi, suýt nữa thì đụng!', 'Tạt đầu thế hả, hết cả hồn!'],
    giatTau: ['Ối, tàu! Lùi lại mau!', 'Giật cả mình, tàu chạy sát quá!', 'Hú hồn, suýt nữa thì đứng trên ray!'],
    xem: ['Cẩn thận chứ, suýt nữa thì đụng!', 'Đi đứng nhìn đường vào!', 'Trời ơi, hú hồn!', 'Chậm thôi, phố đông lắm!'],
    tau: ['Tàu sắp qua, lùi lại nào!', 'Barie hạ rồi, đứng đợi tàu thôi.', 'Tàu đến, cất ghế vào trong nào!', 'Lùi vào, tàu chạy sát lắm đấy!'],
  },
  // (6) thanh âm môi trường (chữ nổi, không khung)
  sound: {
    origin: ['#tau#'],
    tau: ['Xình xịch… xình xịch…', 'Tu tu~ Xình xịch…', 'Xình xịch… ình ịch…'],
    barie: ['Reng reng… reng reng…', 'Leng keng… leng keng…'],
    chuong: ['Kính coong~', 'Kính coong! Kính coong~'],
    cho: ['Gâu gâu!', 'Gâu! Gâu gâu!', 'Ẳng ẳng…'],
    coi: ['Bíp bíp!', 'Tin tin!', 'Bim bim!'],
  },
}

// ───────── cặp hỏi – đáp (đáp luôn khớp câu hỏi) ─────────
// when(ctx) -> có dùng được trong ngữ cảnh này không
const H = (c) => c.hour
const day = (c) => H(c) >= 6 && H(c) < 18
const dry = (c) => !c.rain
export const PAIRS = {
  pass: [   // hai người đi lướt nhau trên phố
    { q: 'Chào bác, dạo này khỏe không?', a: ['Khỏe, cảm ơn bác nhé!', 'Vẫn khỏe, bác cũng khỏe chứ?'] },
    { q: 'Lâu quá mới gặp đấy!', a: ['Ừ, dạo này bận quá, thông cảm nhé.', 'Đúng thế, hôm nào đi cà phê đi!'] },
    { q: 'Ăn sáng chưa đấy?', a: ['Rồi, vừa làm bát phở xong.', 'Chưa, đang định đi ăn bánh cuốn đây.'], when: (c) => H(c) >= 5 && H(c) < 10 },
    { q: 'Đi đâu mà vội thế?', a: ['Đi làm, muộn mất rồi!', 'Đi họp, trễ rồi bác ơi!'], when: (c) => H(c) >= 6.5 && H(c) < 9.5 },
    { q: 'Đi đâu mà vội thế?', a: ['Đi đón con, tan học rồi!', 'Về nấu cơm, nhà chờ rồi.'], when: (c) => H(c) >= 16 && H(c) < 18.5 },
    { q: 'Trưa rồi, ăn gì đây?', a: ['Bún chả đi, gần đây có quán ngon.', 'Cơm văn phòng cho nhanh.'], when: (c) => H(c) >= 11 && H(c) < 13.5 },
    { q: 'Hôm nay trời đẹp nhỉ?', a: ['Ừ, mát mẻ dễ chịu thật.', 'Ừ, hanh hanh dễ chịu.'], when: (c) => dry(c) && day(c) && c.weather !== 'cloudy' },
    { q: 'Mưa thế này, có mang áo mưa không?', a: ['Có, để trong cốp xe rồi.', 'Quên mất, chạy vào hiên trú tạm vậy!'], when: (c) => c.rain },
    { q: 'Tối nay đi phố đi bộ không?', a: ['Đi chứ, ăn kem Tràng Tiền luôn!', 'Đi, nghe nói có nhóm nhảy hay lắm.'], when: (c) => (c.wd === 5 || c.wd === 6 || c.wd === 0) && H(c) >= 12 && H(c) < 21 && dry(c) },
    { q: 'Cuối tuần đi dạo hồ không?', a: ['Đi chứ, đi bộ một vòng hồ!', 'Để xem, sợ cuối tuần mưa.'], when: (c) => c.wd >= 1 && c.wd <= 4 },
    { q: 'Thứ Hai rồi, uể oải quá.', a: ['Cố lên, mới đầu tuần thôi!', 'Ừ, chỉ mong mau đến cuối tuần.'], when: (c) => c.wd === 1 && H(c) >= 6 && H(c) < 12 },
    { q: 'Tối rồi, về ăn cơm thôi!', a: ['Ừ, về kẻo nhà chờ.', 'Về thôi, đói lắm rồi.'], when: (c) => H(c) >= 17.5 && H(c) < 20 },
    { q: 'Khuya rồi còn đi đâu thế?', a: ['Đi ăn phở đêm, đói quá!', 'Vừa tan ca, về ngủ đây.'], when: (c) => H(c) >= 22 || H(c) < 4 },
  ],
  couple: [  // đôi tình nhân ngồi ghế đá (18:30–23h)
    { q: 'Hồ đêm nay đẹp anh nhỉ?', a: ['Ừ, đẹp như em vậy.', 'Đẹp thật, ngồi thêm chút nữa nhé.'], when: (c) => c.nearLake },
    { q: 'Gió hồ lạnh không em?', a: ['Hơi lạnh, nhưng ngồi cạnh anh thì ấm.', 'Không sao, gió mát mà.'], when: (c) => c.nearLake },
    { q: 'Phố đêm nay đông nhỉ?', a: ['Ừ, ngồi đây ngắm người qua lại cũng vui.'], when: (c) => !c.nearLake },
    { q: 'Mai mình đi ăn kem Tràng Tiền nhé?', a: ['Ừ, nhớ mua cả kem cốm nhé!', 'Lạnh thế này mà còn đòi ăn kem à?'] },
    { q: 'Khuya rồi, anh đưa em về nhé.', a: ['Ngồi thêm năm phút nữa thôi.'], when: (c) => H(c) >= 22 },
  ],
  elder: [   // cụ ông uống trà đá vỉa hè
    { q: 'Trà hôm nay đậm nhỉ cụ?', a: ['Đậm, uống tỉnh cả người.'] },
    { q: 'Nghe đài bảo mai trời trở lạnh đấy.', a: ['Thế à, phải lấy áo bông ra rồi.'] },
    { q: 'Dạo này rau ngoài chợ đắt quá.', a: ['Đắt thật, cái gì cũng lên giá.'] },
    { q: 'Cháu nhà ông thi cử thế nào?', a: ['Đỗ rồi, đỗ Bách Khoa đấy!', 'Đang ôn, thức khuya lắm.'] },
    { q: 'Cho thêm cốc trà đá cô ơi!', a: ['Có ngay đây ông ơi!'] },
  ],
  chess: [   // đánh cờ tướng
    { q: 'Chiếu tướng! Cụ đỡ đi.', a: ['Từ từ, để tôi tính nước đã.', 'Ối, nước này hiểm quá!'] },
    { q: 'Nước này cụ đi hay đấy.', a: ['Cờ già mà, ăn nhau ở kinh nghiệm.'] },
    { q: 'Đi nhanh lên, chờ mãi.', a: ['Cờ là phải nghĩ, vội gì!'] },
    { q: 'Ván này hòa nhé?', a: ['Hòa thế nào được, tôi sắp thắng rồi!'] },
  ],
  cafeTau: [ // khách quán cà phê – trà chanh phố tàu
    { q: 'Sắp có tàu chưa chị chủ?', a: ['Sắp rồi, nhớ ngồi lùi vào trong nhé!', 'Mười phút nữa, cứ ngồi uống đi.'] },
    { q: 'Cà phê trứng ở đây béo ngậy thật.', a: ['Ừ, uống xong còn được xem tàu.'], when: (c) => H(c) < 17 },
    { q: 'Trà chanh ở đây chua ngọt vừa miệng.', a: ['Ừ, ngồi xem tàu là nhất.'], when: (c) => H(c) >= 11 },
    { q: 'Tàu qua sát thế này, có sợ không?', a: ['Hơi sợ, nhưng chụp ảnh đẹp lắm!'] },
  ],
  stoolToi: [ // ghế nhựa vỉa hè buổi tối (trà chanh / bia hơi)
    { q: 'Trà chanh quán này ngon thế nhỉ?', a: ['Ừ, chua ngọt vừa miệng.'] },
    { q: 'Thêm đĩa hướng dương không?', a: ['Thêm đi, ngồi chém gió còn lâu.'] },
    { q: 'Quán đông ghê, may còn chỗ.', a: ['Tối thứ Sáu mà, đông là phải.'], when: (c) => c.wd === 5 },
    { q: 'Quán đông ghê, may còn chỗ.', a: ['Tối cuối tuần mà, đông là phải.'], when: (c) => c.wd === 6 || c.wd === 0 },
    { q: 'Cho thêm cốc trà chanh nữa chị ơi!', a: ['Có ngay, đợi chút nhé!'] },
    { q: 'Nghe nói mai mưa đấy.', a: ['Thế thì tối nay ngồi cho đã.'], when: dry },
  ],
  stoolNgay: [ // ghế nhựa vỉa hè ban ngày (trà đá, cơm trưa)
    { q: 'Trưa nay ăn gì cho nhanh?', a: ['Gọi suất cơm bụi đi.', 'Bún chả đầu ngõ ấy, ngon lắm.'], when: (c) => H(c) >= 10.5 && H(c) < 14 },
    { q: 'Làm cốc trà đá cho mát nào.', a: ['Ừ, uống trà đá ngồi hóng gió là nhất.'] },
    { q: 'Chuyện nhà dạo này sao rồi?', a: ['Cũng ổn, con cái đi học đều.'] },
  ],
}
const okPair = (p, c) => !p.when || p.when(c)
export function pickPair(set, c, rnd = Math.random) {
  const L = (PAIRS[set] || PAIRS.pass).filter((p) => okPair(p, c)), pool = L.length ? L : PAIRS.pass.filter((p) => !p.when)
  const p = pool[Math.floor(rnd() * pool.length)]
  return [p.q, p.a[Math.floor(rnd() * p.a.length)]]
}
// bộ câu cho khách ngồi theo dáng NPC + khu vực
export function sitterSet(pose, c) {
  if (pose === 'coupleSit') return 'couple'
  if (pose === 'chess') return 'chess'
  if (pose === 'elderTea') return 'elder'
  if (c.zone === 'rail') return 'cafeTau'
  return H(c) >= 17 || H(c) < 2 ? 'stoolToi' : 'stoolNgay'
}

// ───────── tracery ─────────
const cache = {}
const grammar = (k, extra) => (extra ? tracery.createGrammar({ ...G[k], ...extra }) : (cache[k] ||= tracery.createGrammar(G[k])))

// expand('think', {slot:'mua'}, {item:['tóc đỏ']}) -> chuỗi. `slot` là ký hiệu gốc cần bung (mặc định origin).
export function expand(kind, opt = {}, extra) {
  try { return grammar(kind, extra).flatten('#' + (opt.slot || 'origin') + '#').replace(/\s+/g, ' ').trim() } catch (e) { console.error('[bubbles] tracery', e); return '…' }
}

// khung giờ rao hàng
export const slotOfHour = (hr) => (hr >= 5 && hr < 10.5 ? 'sang' : hr >= 10.5 && hr < 16.5 ? 'trua' : hr >= 16.5 && hr < 22 ? 'toi' : 'khuya')
// ký hiệu rao hàng cho một quán: kind 'pho'|'banhmi'|'tc', pinned 'pho_dem'|'pho_ganh'|'banh_mi_khuya'|'circle_k'
export function vendorSlot(kind, pinned, hour) {
  if (pinned === 'circle_k') return 'cstore'
  if (pinned === 'pho_ganh') return 'pho_ganh'
  const s = slotOfHour(hour)
  if (kind === 'tc') return 'tc_' + s
  if (kind === 'banhmi') return 'banhmi_' + s
  return 'pho_' + s
}

// ký hiệu suy nghĩ theo ngữ cảnh đầy đủ. Không bao giờ ra câu "nắng" khi mưa / trời tối / trời nhiều mây.
export function pickThink(c, rnd = Math.random) {
  const h = H(c), ss = Number.isFinite(c.sunset) ? c.sunset : 17.25
  if (c.rain) return 'mua'
  if (c.zone === 'alley' && rnd() < 0.5) return 'ngo'
  if (c.zone === 'rail' && rnd() < 0.4) return 'tau'
  if (h >= 6 && h < 17 && rnd() < 0.2) {
    if (c.wd === 1 && h < 12) return 'thu2'
    if (c.wd === 5) return 'thu6'
    if (c.wd === 6 || c.wd === 0) return 'cuoituan'
  }
  if (h >= 4.5 && h < 9) return c.nearLake && rnd() < 0.7 ? 'sangHo' : 'sang'
  if (h >= 9 && h < 10.5) return rnd() < 0.5 ? 'sang' : 'chung'
  if (h >= 10.5 && h < 14.5) return c.weather === 'sunny' ? 'trua' : 'truaMay'
  if (h >= 14.5 && h < ss - 0.75) return 'chung'
  if (h >= ss - 0.75 && h < ss + 0.4) return c.nearLake && c.weather === 'sunny' ? 'hoanghonHo' : 'chieu'
  if (h >= ss + 0.4 && h < 22) return c.ws && rnd() < 0.5 ? 'toiPdb' : 'toi'
  return 'khuya'
}
// bản rút gọn chỉ theo mưa + giờ (dùng cho __bubbles.say khi không có ngữ cảnh khu vực)
export const thinkSlot = ({ rain, hour, weather = 'cloudy', sunset }) => pickThink({ rain, hour, weather, sunset, zone: 'street', nearLake: false, wd: 2, ws: false }, () => 0.99)
